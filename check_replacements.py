
import re

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
    return data

def main():
    filepath = r'c:\Users\User\Desktop\새 폴더\gilmaru\word_data.js'
    data = load_word_data(filepath)
    
    # Proposed Replacements
    replacements = {
        'wordA': {
            '기침': '기적',
            '냄새': '날개',
            '복용': '봄날',
            '부장': '바다',
            '실종': '사슴',
            '얼룩': '연꽃',
            '월세': '위로',
            '처방': '초원'
        },
        'wordB': {
            '감기': '감성',
            '눈물': '나비',
            '멀미': '모래',
            '실망': '소망',
            '우울': '영원',
            '집세': '지혜'
        },
        'wordC': {
            '고생': '고요',
            '공짜': '공감',
            '눈병': '눈빛',
            '복통': '보물',
            '불안': '불꽃',
            '슬픔': '승리',
            '실패': '신뢰',
            '아픔': '안목'
        },
        'wordD': {
            '갈증': '갈대',
            '걱정': '결실',
            '배탈': '배려',
            '변비': '별님',
            '설사': '설렘',
            '싫증': '실감',
            '코피': '크림',
            '포기': '포옹',
            '한숨': '한복'
        }
    }

    # Apply Replacements
    new_data = {}
    for group, words in data.items():
        new_words = words[:] # copy
        if group in replacements:
            rep_map = replacements[group]
            for i, w in enumerate(new_words):
                if w in rep_map:
                    new_words[i] = rep_map[w]
        new_data[group] = new_words

    # Check Duplicates across ALL groups
    all_words_map = {} # word -> list of groups
    
    groups = ['wordA', 'wordB', 'wordC', 'wordD']
    for grp in groups:
        for w in new_data[grp]:
            if w not in all_words_map:
                all_words_map[w] = []
            all_words_map[w].append(grp)
            
    duplicates = {w: grps for w, grps in all_words_map.items() if len(grps) > 1}
    
    print(f"--- Replacement Verification ---")
    if not duplicates:
        print("✅ No duplicates found! The proposed words are safe.")
    else:
        print(f"❌ Found {len(duplicates)} duplicates:")
        for w, grps in duplicates.items():
            print(f"  - '{w}': found in {grps}")

    # Also check if replacmenets introduced self-duplicates (e.g. A has '바다' and we replaced '부장'->'바다')
    print("\n--- Self-Duplicate Check (within same group) ---")
    for grp in groups:
        words = new_data[grp]
        if len(words) != len(set(words)):
            print(f"❌ {grp} contains duplicates!")
            # Identify which ones
            seen = set()
            dups = set()
            for w in words:
                if w in seen: dups.add(w)
                seen.add(w)
            print(f"   {dups}")

    
    # Check Verification for Sorting
    print("\n--- Sorting Check ---")
    for grp in groups:
        words = new_data[grp]
        sorted_words = sorted(words)
        if words != sorted_words:
            print(f"❌ {grp} is NOT sorted!")
            # Find first unsorted element
            for i in range(len(words)-1):
                if words[i] > words[i+1]:
                    print(f"   Unsorted pair at index {i}: {words[i]} > {words[i+1]}")
                    break
        else:
            print(f"✅ {grp} is sorted.")

    # Print Summary of Changes
    print("\n--- Summary of Changes ---")
    for grp in groups:
        if grp in replacements:
            print(f"[{grp}]")
            for old, new in replacements[grp].items():
                print(f"  {old} -> {new}")

if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    main()
