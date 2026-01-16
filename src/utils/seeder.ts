import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Food } from "../../types";

export const seedBaseFoods = async (foods: Food[]) => {
    const collectionRef = collection(db, "base_foods");

    console.log(`Starting upload of ${foods.length} foods to base_foods...`);

    let successCount = 0;
    let errorCount = 0;

    for (const food of foods) {
        try {
            // Use food.id as the document ID to ensure idempotency and prevent duplicates
            const docRef = doc(collectionRef, food.id);
            await setDoc(docRef, food);
            console.log(`Uploaded: ${food.name} (${food.id})`);
            successCount++;
        } catch (error) {
            console.error(`Failed to upload: ${food.name} (${food.id})`, error);
            errorCount++;
        }
    }

    console.log(`Upload complete. Success: ${successCount}, Errors: ${errorCount}`);
    alert(`Upload complete.\nSuccess: ${successCount}\nErrors: ${errorCount}`);
};
