
import math

def load_word_data(filepath):
    # Quick implementation: parse word_data.js in JS style to Python struct
    # We will just extract words by naive parsing
    import re
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    data = {}
    for name in ['wordA', 'wordB', 'wordC', 'wordD']:
        regex = r'const ' + name + r' = \[([\s\S]*?)\];'
        match = re.search(regex, content)
        if match:
            arr_str = match.group(1)
            # clean up
            words = []
            for line in arr_str.split(','):
                w = line.strip().strip('"')
                if not w or w.startswith('//'): continue
                words.append(w)
            data[name] = words
    return data

def get_code_from_latlon(lat, lng):
    originLat = 33.0
    originLng = 124.0
    blockSize = 0.005 # ~550m
    subBlockSize = 500

    y = math.floor((lat - originLat) / blockSize)
    x = math.floor((lng - originLng) / blockSize)

    latOffset = (lat - originLat) % blockSize
    lngOffset = (lng - originLng) % blockSize

    innerX = math.floor((lngOffset / blockSize) * subBlockSize)
    innerY = math.floor((latOffset / blockSize) * subBlockSize)

    return {
        'x': x, 'y': y, 
        'innerX': innerX, 
        'innerY': innerY,
        'C': innerX, 'D': innerY # In JS code it was C=innerX, D=innerY basically. 
                                 # wait, codeC = innerX + 1. Let's align with logic
    }

def get_words(result, word_data):
    # From JS:
    # const X = parseInt(parts[0].substring(1)) || 0; -> This is grid X
    # const Y = parseInt(parts[1].substring(1)) || 0; -> This is grid Y
    # const C = parseInt(parts[2].substring(1)) || 0; -> This is innerX + 1
    # const D = parseInt(parts[3].substring(1)) || 0; -> This is innerY + 1
    
    # words logic:
    # wordA[((X + C) * 11) % wordA.length]
    # wordB[((Y + D) * 17) % wordB.length]
    # ...
    
    X = result['x']
    Y = result['y']
    C = result['innerX'] + 1
    D = result['innerY'] + 1
    
    wa = word_data['wordA']
    wb = word_data['wordB']
    wc = word_data['wordC']
    wd = word_data['wordD']
    
    w1 = wa[((X + C) * 11) % len(wa)]
    w2 = wb[((Y + D) * 17) % len(wb)]
    w3 = wc[((X + Y + C) * 23) % len(wc)]
    w4 = wd[((Y + C + D) * 29) % len(wd)]
    
    return [w1, w2, w3, w4]

def has_jongseong(word):
    if not word: return False
    code = ord(word[-1]) - 44032
    if code < 0 or code > 11171: return False
    return code % 28 != 0

def get_josa(word, josa_type):
    has = has_jongseong(word)
    if josa_type == 'iga': return '이' if has else '가'
    if josa_type == 'eunneun': return '은' if has else '는'
    if josa_type == 'eulreul': return '을' if has else '를'
    if josa_type == 'wagwa': return '과' if has else '와'
    if josa_type == 'irang': return '이랑' if has else '랑'
    return ''

def generate_sentence(words, seed):
    # Deterministic Shuffle logic in Python
    # simple seeded random generator
    _seed = seed
    def seeded_random():
        nonlocal _seed
        _seed = (_seed * 9301 + 49297) % 233280
        return _seed / 233280

    shuffled_idx = [0, 1, 2, 3]
    for i in range(3, 0, -1):
        rand_float = seeded_random()
        j = math.floor(rand_float * (i + 1))
        shuffled_idx[i], shuffled_idx[j] = shuffled_idx[j], shuffled_idx[i]
        
    w_list = [words[i] for i in shuffled_idx]
    
    # Just print plain text for now, adding highlight marking in console
    def H(w): return f"**{w}**"
    
    template_idx = math.floor(seeded_random() * 5)
    w1, w2, w3, w4 = w_list

    s = ""
    if template_idx == 0:
        s = f"{H(w1)}{get_josa(w1,'iga')} {H(w2)}에서 {H(w3)}{get_josa(w3,'wagwa')} {H(w4)}"
    elif template_idx == 1:
        s = f"{H(w1)}{get_josa(w1,'eunneun')} {H(w2)}, {H(w3)} 그리고 {H(w4)}"
    elif template_idx == 2:
        s = f"{H(w1)}{get_josa(w1,'wagwa')} {H(w2)}의 {H(w3)}, {H(w4)}"
    elif template_idx == 3:
        s = f"{H(w1)}, {H(w2)}{get_josa(w2,'irang')} {H(w3)}에서 {H(w4)}"
    else:
        s = f"{H(w1)}{get_josa(w1,'iga')} {H(w2)}{get_josa(w2,'eulreul')} 만나 {H(w3)}{get_josa(w3,'wagwa')} {H(w4)}"
        
    return s

def main():
    word_file = r'c:\Users\User\Desktop\새 폴더\gilmaru\word_data.js'
    data = load_word_data(word_file)
    
    # National Assembly Library
    lat = 37.531111
    lng = 126.917222
    
    res = get_code_from_latlon(lat, lng)
    words = get_words(res, data)
    
    # seed logic: x * 500 + innerX + y * 500 + innerY 
    # Wait, in app.js: generateSentence(words, gilmaru.x + gilmaru.y);
    # gilmaru.x = x * 500 + innerX
    # gilmaru.y = y * 500 + innerY
    
    gx = res['x'] * 500 + res['innerX']
    gy = res['y'] * 500 + res['innerY']
    seed = gx + gy
    
    sentence = generate_sentence(words, seed)
    
    print(f"Words: {words}")
    print(f"Sentence: {sentence}")

if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    main()
