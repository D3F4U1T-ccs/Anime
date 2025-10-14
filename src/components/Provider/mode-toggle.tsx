
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/Provider/theme-provider";
import { useEffect, useState } from "react";


export function ModeToggle() {
  const { setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    if (document.documentElement.classList.contains("dark")) {
      setIsDark(true);
    } else {
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      setTheme("light");
      setIsDark(false);
    } else {
      setTheme("dark");
      setIsDark(true);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="relative bg-gradient-to-tr from-indigo-200/60 via-pink-100/60 to-yellow-100/60 dark:from-slate-800 dark:to-slate-900 border-0 shadow-md hover:scale-105 transition-all duration-300"
    >
      <Sun
        className={`h-[1.4rem] w-[1.4rem] text-yellow-500 transition-all duration-300 ${isDark ? 'scale-0 rotate-90 absolute' : 'scale-100 rotate-0'}`}
      />
      <Moon
        className={`h-[1.4rem] w-[1.4rem] text-indigo-500 transition-all duration-300 ${isDark ? 'scale-100 rotate-0' : 'scale-0 -rotate-90 absolute'}`}
      />
    </Button>
  );
}

