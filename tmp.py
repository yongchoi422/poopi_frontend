import re
import os
import json

def get_groups_og(match):
    x, y, width, height = match.groups()
    return x, y, width, height

def get_groups_jelli(match):
    x, y, width, height= match.groups()
    return x, y, width, height

def get_art_file(art_path):
    # read the file in lines
    with open(art_path, 'r') as f:
        lines = f.readlines()
    if lines[1] == '<!-- Generator: Adobe Illustrator 28.2.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n':
        print('1', flush=True)
        for i, line in enumerate(lines):
            if line == '</style>\n':
                lines = lines[i+1:-1]
                break        
        pattern = re.compile(r'\s*<rect class="st0" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)".*>')        
        get_groups = get_groups_jelli
    else:
        print('2', flush=True)           
        if lines[0] in [
                '<?xml version="1.0" encoding="UTF-8" ?>\n', 
                '<?xml version="1.0" encoding="UTF-8" standalone="yes">\n',
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            ]:
            assert lines[1] == '<svg version="1.1" width="24" height="24" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">\n', art_path 
            lines = lines[2:]
        else:
            assert lines[0] in [
                '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="24" height="24" shape-rendering="crispEdges">\n',
                '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="24" height="24" shape-rendering="crispEdges" style="&#10;">\n',
                '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="24" height="24" shape-rendering="crispEdges" style="">\n'
            ], art_path    
            lines = lines[1:]     

        assert lines[-1] == '</svg>', art_path
        lines = lines[:-1]
        # pattern = re.compile(r' *<rect x="(\d+\.?\d*)" y="(\d+\.?\d*)" width="(\d+\.?\d*)" height="(\d+\.?\d*)" fill="#([0-9A-F]+)" ?/>')
        pattern = re.compile(r'\s*<rect(?:\s+class="[^"]*")? x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)".*\/>')

        get_groups = get_groups_og

    art_id = int(art_path.split('/')[-1].replace('.svg', ''))-1
    level = art_path.split('/')[-2]
    rects = []
    for line in lines:
        match = pattern.match(line)
        # print(pattern)    
        # print(match)
        # print(line)
        try:
            assert match is not None, art_path + ' ' + line
        except:
            import pdb; pdb.set_trace()
            raise Exception('Error')
        x, y, width, height = get_groups(match)
        # print(x, y, width, height, fill)
        rect = [round(float(x)), round(float(y)), round(float(width)), round(float(height))]
        rects.append(rect)
    
    file = [int(level), art_id, rects]
    return file


def to_rect_json(x):
    # the json is read into a tuple
    # the key alphabetical order is how the tuple element order is decided
    # stupid, but is what it is - need to make sure that the key alphabetical order matches the solidity struct key order    
    _json = {}
    _json['0_lvl'] = x[0]
    _json['1_file'] = x[1]
    _rects = []
    for _rect in x[2]:
        _rect_json = {}
        _rect_json['0_x'] = _rect[0]
        _rect_json['1_y'] = _rect[1]
        _rect_json['2_width'] = _rect[2]
        _rect_json['3_height'] = _rect[3]
        _rects.append(_rect_json)
    _json['2_rects'] = _rects
    return _json
    # print(json.dumps(_json, indent=4))

def parse_art(art_folder):
    folders = []
    for folder in os.listdir(art_folder):
        # check i f is folder
        if not os.path.isdir(art_folder + folder):
            continue
        if folder == 'data':
            continue
        folders.append(folder)

    print(folders)

    for folder in folders:
        print(folder)

        art_files = []
        art_files_json = []
        for level in os.listdir(art_folder + folder):
            if not os.path.isdir(art_folder + folder):
                continue
            for art in os.listdir(art_folder + folder + '/' + level):
                if not art.endswith('.svg'):
                    continue
                art_path = art_folder + folder + '/' + level + '/' + art
                art_file = get_art_file(art_path)
                art_files_json.append(to_rect_json(art_file))
                print(art_file)
                art_files.append(art_file)
                # break

        json_folder = '../forge/data/fungi/'
        with open(json_folder + folder + '.json', 'w') as f:
            f.write(json.dumps(art_files_json, indent=4) + '\n')

        art_files = json.dumps(art_files)    
        with open(json_folder + folder + '.txt', 'w') as f:
            f.write(art_files + '\n')    

parse_art(art_folder)