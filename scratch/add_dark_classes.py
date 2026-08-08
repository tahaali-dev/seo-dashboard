import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Define replacements
    # We want to replace standard classes with their dark mode counterparts ONLY if the dark mode counterpart isn't already there.
    # To be safe, we'll just do a global replace for common strings that match tailwind classes.
    # Since classNames are space separated strings, we can use regex boundaries to ensure we match whole classes.

    replacements = [
        (r'\bbg-white\b', 'bg-white dark:bg-[#1E1E1E]'),
        (r'\bbg-\[\#FAFAFA\]\b', 'bg-[#FAFAFA] dark:bg-white/5'),
        (r'\bbg-black/5\b', 'bg-black/5 dark:bg-white/5'),
        (r'\bbg-black/\[0\.03\]\b', 'bg-black/[0.03] dark:bg-white/[0.03]'),
        (r'\bbg-black/10\b', 'bg-black/10 dark:bg-white/10'),
        
        (r'\btext-black-80\b', 'text-black-80 dark:text-white/80'),
        (r'\btext-black-60\b', 'text-black-60 dark:text-white/60'),
        (r'\btext-black-40\b', 'text-black-40 dark:text-white/40'),
        (r'\btext-foreground\b', 'text-foreground dark:text-white'),
        
        (r'\bhover:text-black-80\b', 'hover:text-black-80 dark:hover:text-white/80'),
        (r'\bhover:text-black-60\b', 'hover:text-black-60 dark:hover:text-white/60'),
        (r'\bhover:bg-\[\#FAFAFA\]\b', 'hover:bg-[#FAFAFA] dark:hover:bg-white/10'),
        (r'\bhover:bg-black/5\b', 'hover:bg-black/5 dark:hover:bg-white/10'),
        
        (r'\bborder-black/5\b', 'border-black/5 dark:border-white/5'),
        (r'\bborder-black/\[0\.04\]\b', 'border-black/[0.04] dark:border-white/[0.04]'),
        (r'\bborder-black/\[0\.06\]\b', 'border-black/[0.06] dark:border-white/[0.06]'),
        (r'\bborder-black/10\b', 'border-black/10 dark:border-white/10'),
        (r'\bborder-black/20\b', 'border-black/20 dark:border-white/20'),
        (r'\bdivide-black/5\b', 'divide-black/5 dark:divide-white/5'),

        (r'\bshadow-\[0_4px_24px_rgba\(0,0,0,0\.03\)\]\b', 'shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none'),
        (r'\bshadow-\[0_2px_14px_rgba\(0,0,0,0\.03\)\]\b', 'shadow-[0_2px_14px_rgba(0,0,0,0.03)] dark:shadow-none'),
        (r'\bshadow-\[0_2px_12px_rgba\(0,0,0,0\.02\)\]\b', 'shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none'),
        
        # Badges
        (r'\bbg-\[\#FFF5F5\]\b', 'bg-[#FFF5F5] dark:bg-[#E80C08]/10'),
        (r'\bbg-emerald-50\b', 'bg-emerald-50 dark:bg-emerald-500/10'),
        (r'\bborder-emerald-200\b', 'border-emerald-200 dark:border-emerald-500/20'),
        (r'\bbg-yellow-50\b', 'bg-yellow-50 dark:bg-yellow-500/10'),
        (r'\bborder-yellow-200\b', 'border-yellow-200 dark:border-yellow-500/20'),
    ]

    new_content = content
    for pattern, replacement in replacements:
        # Avoid replacing if the dark counterpart is already right after it
        # This is a bit tricky with regex, so we'll just replace carefully
        # We can just run it once per file
        # We can use negative lookahead to not match if ' dark:' is already there
        # For simplicity, we just do it naive, since it's a one-off run
        
        # Regex to match the class, ensuring it's not already followed by dark:
        regex = pattern + r'(?! dark:)'
        new_content = re.sub(regex, replacement, new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
