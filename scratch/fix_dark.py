import re
import os

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()

    original = content

    # ---- 1. Fix broken/invalid dark class patterns ----
    # dark:bg-white/5/50 and similar malformed patterns
    content = re.sub(r'dark:bg-white/5/\d+', 'dark:bg-white/5', content)
    content = re.sub(r'dark:bg-white/10/\d+', 'dark:bg-white/10', content)
    
    # Fix dark:bg-[#1E1E1E]/XX patterns (opacity doesn't work like this)
    content = re.sub(r'dark:bg-\[#1E1E1E\]/30', 'dark:bg-[#1E1E1E]', content)
    content = re.sub(r'dark:bg-\[#1E1E1E\]/50', 'dark:bg-[#1E1E1E]', content)
    content = re.sub(r'dark:bg-\[#1E1E1E\]/90', 'dark:bg-[#1E1E1E]/90', content)

    # Fix malformed compound dark classes that came from chaining
    # e.g. "dark:hover:bg-white dark:bg-[#1E1E1E]/5 dark:bg-black-main"
    content = re.sub(r'dark:hover:bg-white dark:bg-\[#1E1E1E\]\/5 dark:bg-black-main', 'dark:hover:bg-white/10', content)

    # ---- 2. Fix specific incorrect dark color assignments ----
    # Modals/dialogs overlay backdrop
    content = content.replace('bg-[#FAFAFA]/80 backdrop-blur-md', 'bg-white/80 dark:bg-black/80 backdrop-blur-md')

    # bg-[#FAFAFA] without dark mode partner (for non-dynamic cases only)
    # Already handled by script run before

    # ---- 3. Fix select/input dark bg styling (option elements inherit) ----
    # bg-[#FAFAFA]/50 in inputs
    content = content.replace('bg-[#FAFAFA]/50 border', 'bg-white dark:bg-[#1A1A1A] border')
    content = content.replace('bg-[#FAFAFA] border', 'bg-white dark:bg-[#1A1A1A] border')

    # ---- 4. Fix IssuesTable hardcoded bad classes ----
    # divide-slate-800 is a hardcoded dark value, use proper token
    content = content.replace('divide-y divide-slate-800', 'divide-y divide-black/10 dark:divide-white/10')
    # bg-black/5 dark:bg-white/5/30 -> bg-black/5 dark:bg-white/5
    content = content.replace('bg-black/5 dark:bg-white/5/30', 'bg-black/5 dark:bg-white/[0.04]')
    content = content.replace('bg-black/5 dark:bg-white/5/50', 'bg-black/5 dark:bg-white/[0.06]')
    content = content.replace('bg-black/5 dark:bg-white/5/80', 'bg-black/5 dark:bg-white/[0.08]')
    
    # IssuesTable container 
    content = content.replace(
        'className="bg-black/5 dark:bg-white/5/30 rounded-xl border border-black/20 dark:border-white/20"',
        'className="bg-white dark:bg-[#171717] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)]"'
    )
    content = content.replace(
        'className="bg-black/5 dark:bg-white/5/50 rounded-xl border border-black/20 dark:border-white/20 overflow-hidden transition-all duration-200 shadow-sm"',
        'className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-black/[0.06] dark:border-white/[0.06] overflow-hidden transition-all duration-200"'
    )
    content = content.replace(
        'className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5/80 hover:bg-black/10 dark:bg-white/10/50 transition-colors"',
        'className="w-full flex items-center justify-between p-4 bg-[#FAFAFA] dark:bg-[#1A1A1A] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"'
    )
    content = content.replace(
        'className="overflow-x-auto border-t border-black/20 dark:border-white/20 bg-white dark:bg-[#1E1E1E]/30"',
        'className="overflow-x-auto border-t border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#171717]"'
    )
    content = content.replace(
        'className="bg-black/5 dark:bg-white/5/30 text-black-60 dark:text-white/60"',
        'className="bg-[#FAFAFA] dark:bg-[#1A1A1A] text-black-60 dark:text-white/60"'
    )
    content = content.replace(
        'className="hover:bg-black/5 dark:bg-white/5/30 transition-colors"',
        'className="hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"'
    )
    content = content.replace(
        'className="p-4 border-b border-black/20 dark:border-white/20 flex justify-between items-center"',
        'className="p-5 border-b border-black/[0.06] dark:border-white/[0.06] flex justify-between items-center"'
    )
    content = content.replace(
        '"bg-slate-500/20 text-black-60 dark:text-white/60"',
        '"bg-black/10 dark:bg-white/10 text-black-60 dark:text-white/60"'
    )
    content = content.replace(
        ': "bg-slate-500/20 text-black-60 dark:text-white/60"',
        ': "bg-black/10 dark:bg-white/10 text-black-60 dark:text-white/60"'
    )

    # ---- 5. Fix analytics container & hover bg for CrawlerClient ----
    # Overview stat cards - already have dark:bg-[#111111], but let's standardize to [#1A1A1A]
    content = content.replace('dark:bg-[#111111]', 'dark:bg-[#1A1A1A]')

    # Tab bar and pill backgrounds
    content = content.replace(
        'className="flex bg-black/[0.03] p-1.5 rounded-xl overflow-x-auto w-full xl:w-auto xl:shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"',
        'className="flex bg-black/[0.04] dark:bg-white/[0.04] p-1.5 rounded-xl overflow-x-auto w-full xl:w-auto xl:shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"'
    )

    # Analytics site filter pill
    content = content.replace(
        '"flex items-center gap-1 bg-black/[0.03] p-1.5 rounded-full w-full sm:w-auto shrink-0"',
        '"flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.04] p-1.5 rounded-full w-full sm:w-auto shrink-0"'
    )

    # Fix tab selected state "bg-white dark:bg-[#1A1A1A]" – active tabs in pill should be brighter card
    # Already has the right pattern. 

    # ---- 6. Page table rows hover - fix double dark: classes ----
    content = content.replace(
        '"w-full flex items-center justify-between p-5 bg-white dark:bg-[#1A1A1A] hover:bg-[#FAFAFA] dark:hover:bg-white dark:bg-[#1E1E1E]/5 dark:bg-black-main transition-colors"',
        '"w-full flex items-center justify-between p-5 bg-white dark:bg-[#1A1A1A] hover:bg-[#FAFAFA] dark:hover:bg-white/[0.05] transition-colors"'
    )
    content = content.replace(
        '"hover:bg-[#FAFAFA] dark:hover:bg-white dark:bg-[#1E1E1E]/5 dark:bg-black-main transition-colors"',
        '"hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04] transition-colors"'
    )

    # ---- 7. Fix select option bg in dark mode (use bg-[#1A1A1A] for selects) ----
    # bg-black/5 dark:bg-white/5 for inputs/selects -> use explicit bg
    # Already done by earlier script for most, check for remaining
    
    # ---- 8. Fix bg-white usage in dark for modals/overlays ----
    content = content.replace(
        'bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 rounded-2xl p-8 shadow-2xl',
        'bg-white dark:bg-[#1C1C1C] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-8 shadow-2xl'
    )
    content = content.replace(
        'bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl',
        'bg-white dark:bg-[#1C1C1C] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-6 shadow-2xl'
    )
    content = content.replace(
        'bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col',
        'bg-white dark:bg-[#1C1C1C] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col'
    )
    content = content.replace(
        'bg-white dark:bg-[#1E1E1E]/90 border border-black/10 dark:border-white/10 rounded-2xl p-8',
        'bg-white dark:bg-[#1C1C1C] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-8'
    )

    # ---- 9. Fix share modal bg items ----
    content = content.replace(
        'bg-white dark:bg-[#1E1E1E]/50 p-4 rounded-lg border border-black/10 dark:border-white/10',
        'bg-[#FAFAFA] dark:bg-white/[0.04] p-4 rounded-lg border border-black/[0.06] dark:border-white/[0.06]'
    )

    # ---- 10. Fix thead bg-[#FAFAFA] dark mode ----
    content = content.replace(
        'className="bg-[#FAFAFA] dark:bg-black-main text-black-60 dark:text-white/60',
        'className="bg-[#FAFAFA] dark:bg-[#1A1A1A] text-black-60 dark:text-white/60'
    )
    content = content.replace(
        'className="bg-[#FAFAFA] dark:bg-black-main',
        'className="bg-[#FAFAFA] dark:bg-[#1A1A1A]'
    )

    # ---- 11. Fix tbodys ----
    content = content.replace(
        'className="divide-y divide-black/5 dark:divide-white/5 bg-white dark:bg-[#1A1A1A]"',
        'className="divide-y divide-black/[0.05] dark:divide-white/[0.05] bg-white dark:bg-[#171717]"'
    )

    # ---- 12. Analytics hover state for OLD/NEW/Score cards ----
    content = content.replace(
        '"bg-white dark:bg-[#1A1A1A] p-8 rounded-3xl border border-black/5 dark:border-white/10 flex flex-row items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.03)]"',
        '"bg-white dark:bg-[#1A1A1A] p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] flex flex-row items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none"'
    )

    # ---- 13. Fix donut track in dark mode ----
    content = content.replace(
        'className="text-black/5"', 
        'className="text-black/10 dark:text-white/10"'
    )

    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed: {path}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            fix_file(os.path.join(root, file))

print("Done.")
