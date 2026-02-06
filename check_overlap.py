
import re

def load_words(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    arrays = {}
    current_array = None
    
    # Simple parsing logic assuming the file format is consistent
    # const wordA = [ ... ];
    
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('const word'):
            current_array = line.split(' ')[1] # wordA
            arrays[current_array] = []
        elif line.startswith('];'):
            current_array = None
        elif current_array and '"' in line:
            # Extract word inside quotes
            match = re.search(r'"([^"]+)"', line)
            if match:
                arrays[current_array].append(match.group(1))
                
    return arrays

def check_overlaps():
    data = load_words(r'c:\Users\User\Desktop\새 폴더\gilmaru\word_data.js')
    
    sets = {k: set(v) for k, v in data.items()}
    keys = list(sets.keys())
    
    overlaps = []
    
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            k1 = keys[i]
            k2 = keys[j]
            intersection = sets[k1].intersection(sets[k2])
            if intersection:
                overlaps.append(f"{k1} and {k2} share {len(intersection)} words: {list(intersection)[:5]}...")
            else:
                pass
                # print(f"{k1} and {k2} are disjoint.")

    if not overlaps:
        print("ALL_DISJOINT")
    else:
        for o in overlaps:
            print(o)

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    check_overlaps()
