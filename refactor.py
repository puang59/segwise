import os
from pathlib import Path
import re

mapping = {
    'atlas': 'atlas',
    'scout': 'scout',
    'forge': 'forge',
    'mosaic': 'mosaic',
    'prism': 'prism',
    'compass': 'compass',
    'quill': 'quill',
    'loom': 'loom'
}

def replace_content(content):
    new_content = content
    for old, new in mapping.items():
        # Match old word, ignore case inside replace logic for specific casing
        new_content = re.sub(rf'(?<![a-zA-Z]){old}(?![a-zA-Z])', new, new_content)
        new_content = re.sub(rf'(?<![a-zA-Z]){old.title()}(?![a-zA-Z])', new.title(), new_content)
        new_content = re.sub(rf'(?<![a-zA-Z]){old.upper()}(?![a-zA-Z])', new.upper(), new_content)
    return new_content

def main():
    root = Path("/Users/puang/segwise")
    exts = {'.py', '.ts', '.tsx', '.md'}
    skip_dirs = {'node_modules', '.next', '__pycache__', '.git', '.gemini', 'venv', 'env'}

    for path in root.rglob('*'):
        if not path.is_file():
            continue
            
        # Check if we should skip
        if any(part in skip_dirs for part in path.parts):
            continue
            
        if path.suffix not in exts:
            continue
            
        try:
            content = path.read_text(encoding='utf-8')
            new_content = replace_content(content)
            if content != new_content:
                path.write_text(new_content, encoding='utf-8')
                print(f"Updated {path}")
        except Exception as e:
            pass

    # Rename files
    for path in list(root.rglob('*'))[::-1]:
        if any(part in skip_dirs for part in path.parts):
            continue
        
        name = path.name
        new_name = name
        for old, new in mapping.items():
            new_name = new_name.replace(old, new)
        
        if new_name != name:
            new_path = path.with_name(new_name)
            path.rename(new_path)
            print(f"Renamed {path} -> {new_path}")

if __name__ == '__main__':
    main()
