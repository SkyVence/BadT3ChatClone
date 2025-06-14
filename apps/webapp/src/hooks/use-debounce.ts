
import { useState, useEffect } from "react";

function useDebounce(value: string, delay: number) {
    // State to store the debounced value
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timer if the value changes before the delay has passed
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Only re-call effect if value or delay changes

    return debouncedValue;
}

export default useDebounce;