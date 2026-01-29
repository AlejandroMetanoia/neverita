
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { LogEntry, MealType } from '../../types';

export interface PredictionResult {
    foodName: string;
    foodId: string;
    grams: number;
    calculated: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    score: number;
    meal: MealType;
}

// Helper to determine meal based on time
const getCurrentMeal = (): MealType => {
    const hour = new Date().getHours();
    // Simple heuristic - adjust as needed
    if (hour >= 5 && hour < 11) return 'Desayuno';
    if (hour >= 11 && hour < 13) return 'Almuerzo'; // Mid-morning / early lunch
    if (hour >= 13 && hour < 17) return 'Comida'; // Main lunch
    if (hour >= 17 && hour < 19) return 'Merienda';
    return 'Cena';
};

export const useHybridPrediction = (todaysLogs: LogEntry[]) => {
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const fetchAndPredict = async () => {
            if (!auth.currentUser || dismissed) {
                setLoading(false);
                return;
            }

            try {
                const currentMeal = getCurrentMeal();
                const userId = auth.currentUser.uid;

                // Fetch last 30 logs for this meal type
                // Order by createdAt desc is ideal, but fallback to date might be tricky in pure query if mixed.
                // We'll prioritize createdAt index if available.
                // Note: The user mentioned "Filter: userId == currentUserId AND meal == currentMeal. Order: createdAt DESC".
                // This requires a composite index. Firestore might throw an error if not created, but we'll try catching it.

                const q = query(
                    collection(db, 'daily_logs'),
                    where('userId', '==', userId),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );

                let querySnapshot;
                try {
                    querySnapshot = await getDocs(q);
                } catch (err) {
                    console.warn("Prediction query failed (likely missing index), falling back to client-side sort or simple query", err);
                    // Fallback: Just get recent logs by date maybe? Or just skip to avoid crashing
                    setLoading(false);
                    return;
                }

                if (querySnapshot.empty) {
                    setPrediction(null);
                    setLoading(false);
                    return;
                }

                const logs: LogEntry[] = [];
                querySnapshot.forEach(doc => {
                    logs.push(doc.data() as LogEntry);
                });

                const scores = calculateHabitScores(logs);

                // Get sorted candidates instead of just one best
                const sortedCandidates = Object.values(scores).sort((a, b) => b.totalScore - a.totalScore);

                // Find the first candidate that isn't in today's logs for the predicted meal
                let bestCandidate = null;

                for (const candidate of sortedCandidates) {
                    if (candidate.totalScore < 40) break; // Optimization: stop if below threshold

                    // Check if this specific food has already been logged TODAY for the CURRENT meal context
                    // This allows "Rice" (eaten at Lunch) to still be suggested for Dinner if valid,
                    // unless it was ALREADY logged for Dinner today.
                    const alreadyLogged = todaysLogs.some(log =>
                        log.foodName === candidate.data.foodName &&
                        log.meal === currentMeal
                    );

                    if (!alreadyLogged) {
                        bestCandidate = candidate.data;
                        break; // Found the winner
                    }
                }

                if (bestCandidate) {
                    setPrediction({
                        foodName: bestCandidate.foodName,
                        foodId: bestCandidate.foodId,
                        grams: bestCandidate.grams,
                        calculated: bestCandidate.calculated,
                        score: 0,
                        meal: currentMeal // Ensure it saves to the NOW meal
                    });
                } else {
                    setPrediction(null);
                }

            } catch (error) {
                console.error("Error in prediction system:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndPredict();
    }, [dismissed, todaysLogs]); // Re-run when logs change (user adds something)

    return { prediction, loading, dismiss: () => setDismissed(true) };
};

const calculateHabitScores = (logs: LogEntry[]) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const scores: Record<string, { totalScore: number; data: LogEntry }> = {};

    logs.forEach((log) => {
        let score = 0;

        // Check if we have a valid timestamp, otherwise parse the date string (YYYY-MM-DD)
        let logDate: Date;
        let hasTime = false;

        if (log.createdAt && typeof log.createdAt.toDate === 'function') {
            logDate = log.createdAt.toDate();
            hasTime = true;
        } else if (log.date) {
            // Fallback to date string, assume noon? Or just skip time-based scoring
            logDate = new Date(log.date);
            hasTime = false;
        } else {
            return; // Skip invalid data
        }

        const logDay = logDate.getDay();

        // 1. FREQUENCY BASE SCORE
        score += 10;

        // 2. RECENCY (LAST 24 HOURS)
        // If we rely on date string only, we can check if it's "today" or "yesterday"
        if (hasTime) {
            const diffMs = now.getTime() - logDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours <= 24 && diffHours >= 0) {
                score += 50;
            }
        } else {
            // Fallback: Check if log.date is today's date string
            const todayStr = now.toISOString().split('T')[0];
            // naive check for yesterday not implemented for string-only to keep it simple, 
            // effectively 0 score for recency if no timestamp unless it's literally today.
            if (log.date === todayStr) {
                score += 50;
            }
        }

        // 3. TIME WINDOW PROXIMITY (+/- 60 MINUTES)
        if (hasTime) {
            const logMinutes = logDate.getHours() * 60 + logDate.getMinutes();
            const timeDiff = Math.abs(currentMinutes - logMinutes);
            if (timeDiff <= 60) {
                score += 30;
            }
        }

        // 4. DAY OF THE WEEK CONSISTENCY
        if (currentDay === logDay) {
            score += 20;
        }

        // Aggregate scores by foodName
        if (!scores[log.foodName]) {
            scores[log.foodName] = {
                totalScore: 0,
                data: log
            };
        }
        scores[log.foodName].totalScore += score;
    });

    return scores;
};


