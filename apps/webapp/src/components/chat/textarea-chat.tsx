import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = target;

        // Check if the textarea has scrollable content
        const hasScrollableContent = scrollHeight > clientHeight;

        if (hasScrollableContent) {
            // Check if we're scrolling up and at the top, or scrolling down and at the bottom
            const isAtTop = scrollTop === 0;
            const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;

            // Only prevent propagation if we're not at the boundaries or if we're scrolling within bounds
            if ((e.deltaY > 0 && !isAtBottom) || (e.deltaY < 0 && !isAtTop)) {
                e.stopPropagation();
            }
        }

        // Call the original onWheel handler if provided
        if (props.onWheel) {
            props.onWheel(e);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        // Prevent scroll events from bubbling up
        e.stopPropagation();

        // Call the original onScroll handler if provided
        if (props.onScroll) {
            props.onScroll(e);
        }
    };

    return (
        <textarea
            className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            ref={ref}
            onWheel={handleWheel}
            onScroll={handleScroll}
            {...props}
        />
    )
})
Textarea.displayName = "Textarea"

export { Textarea }
