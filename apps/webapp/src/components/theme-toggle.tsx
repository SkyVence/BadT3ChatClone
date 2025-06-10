"use client"
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <div onClick={() => { setTheme(theme === "dark" ? "light" : "dark") }} className="flex items-center gap-2 cursor-pointer">
            {theme === "dark" ? (
                <SunIcon className="size-4" />
            ) : (
                <MoonIcon className="size-4" />
            )}
            <span className="text-sm">{theme === "dark" ? "Light" : "Dark"}</span>
        </div>
    )
}