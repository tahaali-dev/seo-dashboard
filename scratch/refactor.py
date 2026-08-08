import re
import sys

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Colors
    content = re.sub(r'bg-slate-900', 'bg-white', content)
    content = re.sub(r'bg-slate-950', 'bg-[#FAFAFA]', content)
    content = re.sub(r'bg-slate-800', 'bg-black/5', content)
    content = re.sub(r'bg-slate-700', 'bg-black/10', content)
    
    content = re.sub(r'border-slate-800', 'border-black/10', content)
    content = re.sub(r'border-slate-700', 'border-black/20', content)
    
    content = re.sub(r'text-slate-400', 'text-black-60', content)
    content = re.sub(r'text-slate-500', 'text-black-40', content)
    content = re.sub(r'text-slate-300', 'text-black-80', content)
    content = re.sub(r'text-slate-200', 'text-foreground', content)
    content = re.sub(r'text-white', 'text-foreground', content)
    
    # Indigo to Red
    content = re.sub(r'bg-indigo-500/20', 'bg-[#FFF5F5]', content)
    content = re.sub(r'bg-indigo-500', 'bg-[#E80C08]', content)
    content = re.sub(r'bg-indigo-600', 'bg-[#E80C08]', content)
    content = re.sub(r'border-indigo-500', 'border-[#E80C08]', content)
    content = re.sub(r'text-indigo-400', 'text-[#E80C08]', content)
    content = re.sub(r'text-indigo-500', 'text-[#E80C08]', content)
    content = re.sub(r'text-indigo-300', 'text-[#E80C08]', content)
    content = re.sub(r'hover:text-indigo-400', 'hover:text-[#E80C08]', content)
    content = re.sub(r'hover:text-indigo-300', 'hover:text-[#E80C08]', content)
    content = re.sub(r'hover:border-indigo-500', 'hover:border-[#E80C08]', content)
    content = re.sub(r'hover:bg-indigo-600', 'hover:bg-[#920403]', content)
    content = re.sub(r'hover:bg-indigo-500', 'hover:bg-[#920403]', content)

    # Emerald (Success) can stay emerald or go to black
    # Let's keep emerald for success messages, it's standard.

    with open(filepath, 'w') as f:
        f.write(content)

process_file(sys.argv[1])
