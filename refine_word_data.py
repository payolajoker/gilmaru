
import re
import json

def load_word_data(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    data = {}
    for name in ['wordA', 'wordB', 'wordC', 'wordD']:
        regex = r'const ' + name + r' = \[([\s\S]*?)\];'
        match = re.search(regex, content)
        if match:
            arr_str = match.group(1)
            words = []
            for line in arr_str.split(','):
                w = line.strip().strip('"')
                if not w or w.startswith('//'): continue
                words.append(w)
            data[name] = words
    return data, content

def main():
    filepath = r'c:\Users\User\Desktop\새 폴더\gilmaru\word_data.js'
    data, original_content = load_word_data(filepath)
    
    replacements = {
        'wordA': {
            '기침': '기적', '냄새': '날개', '복용': '봄날', '부장': '바다',
            '실종': '사슴', '얼룩': '연꽃', '월세': '위로', '처방': '초원'
        },
        'wordB': {
            '감기': '감성', '눈물': '나비', '멀미': '모래', '실망': '소망',
            '우울': '영원', '집세': '지혜'
        },
        'wordC': {
            '고생': '고요', '공짜': '공감', '눈병': '눈빛', '복통': '보물',
            '불안': '불꽃', '슬픔': '승리', '실패': '신뢰', '아픔': '안목'
        },
        'wordD': {
            '갈증': '갈대', '걱정': '결실', '배탈': '배려', '변비': '별님',
            '설사': '설렘', '싫증': '실감', '코피': '크림', '포기': '포옹',
            '한숨': '한복'
        }
    }

    # 1. Replace
    new_data = {}
    for group, words in data.items():
        new_words = words[:]
        if group in replacements:
            rep_map = replacements[group]
            for i, w in enumerate(new_words):
                if w in rep_map:
                    new_words[i] = rep_map[w]
        
        # 2. Sort
        new_words.sort()
        new_data[group] = new_words

    # 3. Generate New File Content
    # We will reconstruct the file content. 
    # To keep the file structure simple, we'll just write new content.
    
    new_content = ""
    
    for group in ['wordA', 'wordB', 'wordC', 'wordD']:
        new_content += f"const {group} = [\n"
        words = new_data[group]
        for i, w in enumerate(words):
            comma = "," if i < len(words) - 1 else ""
            new_content += f'    "{w}"{comma}\n'
        new_content += "];\n\n"
        
    # Write to file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("✅ word_data.js has been updated with replacements and sorting.")

if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    main()
