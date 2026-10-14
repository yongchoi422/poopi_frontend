// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./lib/Ownable.sol";

uint constant levelsCount = 4;
uint constant bcgroundsCount = 6;
uint constant groundsCount = 2;
uint8 constant pixelsCount = 24;
uint constant seedLevel1 = 210; //change removed 2digit for testing (21,000 -> 210)
uint constant seedLevel2 = 5250;
uint constant seedLevel3 = 10500;
uint constant seedLevel4 = 15750;
// uint constant seedLevel5 = 2100000;
string constant description = "Souli, $SOULI. The ERC-20i with Native Inscriptions.";
string constant web = "https://souli.net/";

struct SoulData {
    uint lvl;
    string background;
    uint ground;
    string groundColor;
    uint body;
    string bodyColor;
    uint eye;
    string eyeColor;
    uint effect;
    string effectColor;
    bool hasDots;
    string dotsColor;
}

struct Rect {
    uint8 x;
    uint8 y;
    uint8 width;
    uint8 height;
}

struct FileData {
    uint lvl;
    uint file;
    Rect[] rects;
}

struct ColorsData {
    string[] lvl0;
    string[] lvl1;
    string[] lvl2;
    string[] lvl3;
    // string[] lvl4;
}

struct SeedData {
    uint seed;
    uint extra;
}

struct Rand {
    uint seed;
    uint nonce;
    uint extra;
}

library RandLib {
    function next(Rand memory rnd) internal pure returns (uint) {
        return
            uint(
                keccak256(
                    abi.encodePacked(rnd.seed + rnd.nonce++ - 1, rnd.extra)
                )
            );
    }

    function lvl(Rand memory rnd) internal pure returns (uint) {
        if (rnd.seed < seedLevel1) return 0;
        if (rnd.seed < seedLevel2) return 1;
        if (rnd.seed < seedLevel3) return 2;
        if (rnd.seed < seedLevel4) return 3;
        return 4; 
    }

    function random(
        string[] memory data,
        Rand memory rnd
    ) internal pure returns (string memory) {
        return data[randomIndex(data, rnd)];
    }

    function randomIndex(
        string[] memory data,
        Rand memory rnd
    ) internal pure returns (uint) {
        return next(rnd) % data.length;
    }
}

library LayersLib {
    function setLayers(
        mapping(uint => mapping(uint => Rect[])) storage rects,
        FileData[] calldata data
    ) internal {
        for (uint i = 0; i < data.length; ++i) {
            setFile(rects, data[i]);
        }
    }

    function setFile(
        mapping(uint => mapping(uint => Rect[])) storage rects,
        FileData calldata input
    ) internal {
        Rect[] storage storageFile = rects[input.lvl][input.file];
        for (uint i = 0; i < input.rects.length; ++i) {
            storageFile.push(input.rects[i]);
        }
    }

    function getLvl(
        mapping(uint => mapping(uint => Rect[])) storage rects,
        uint lvl
    ) internal view returns (mapping(uint => Rect[]) storage) {
        return rects[lvl];
    }

    function to_lvl_1(uint l) internal pure returns (uint) {
        if (l > 0) --l;
        return l;
    }
}

library Converter {
    function toString(uint value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint temp = value;
        uint digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

library RectLib {
    using RectLib for Rect;
    using RandLib for Rand;
    using RandLib for string[];
    using Converter for uint8;

    function toSvg(
        Rect memory r,
        string memory color
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "<rect x='",
                    r.x.toString(),
                    "' y='",
                    r.y.toString(),
                    "' width='",
                    r.width.toString(),
                    "' height='",
                    r.height.toString(),
                    "' fill='",
                    color,
                    "'/>"
                )
            );
    }

    function toSvg(
        Rect[] storage rects,
        string[] storage colors,
        Rand memory rnd
    ) internal view returns (string memory) {
        string memory res;
        for (uint i = 0; i < rects.length; ++i) {
            res = string(
                abi.encodePacked(res, rects[i].toSvg(colors.random(rnd)))
            );
        }
        return res;
    }

    function toSvg(
        Rect[] storage rects,
        string memory color
    ) internal view returns (string memory) {
        string memory res;
        for (uint i = 0; i < rects.length; ++i) {
            res = string(abi.encodePacked(res, rects[i].toSvg(color)));
        }
        return res;
    }
}

contract Generator is Ownable {
    using LayersLib for mapping(uint => mapping(uint => Rect[]));
    using LayersLib for mapping(uint => string[]);
    using LayersLib for uint;
    using RectLib for Rect;
    using RectLib for Rect[];
    using RandLib for Rand;
    using RandLib for string[];
    using Converter for uint;

    uint8 essences_count = 23;
    uint8[levelsCount] effectLevelCounts = [5, 8, 8, 9];
    uint8[levelsCount] bodyLevelCounts = [20, 20, 20, 16];
    uint8[levelsCount] eyeLevelCounts = [2, 9, 15, 20];
    uint8[levelsCount] dotLevelCounts = [5, 20, 15, 22];

    mapping(uint => Rect[]) essences;
    mapping(uint => mapping(uint => Rect[])) effects;
    mapping(uint => mapping(uint => Rect[])) bodies;
    mapping(uint => mapping(uint => Rect[])) eyes;
    mapping(uint => mapping(uint => Rect[])) dots;
    mapping(uint => Rect[]) grounds;

    string[] private backgroundColors0 = [
        "#C1FAE8",
        "#DCDCDC",
        "#FFFFFF",
        "#B8EAFB",
        "#E4D5FA",
        "#FEF3B6",
        "#FEBFC5",
        "#EAC4B0",
        "#C6FAE4",
        "#FDC6E9",
        "#F0FFCB"
    ];

    string[] private groundColors0 = [
        "#5D5FAA",
        "#504B59",
        "#EE5C75",
        "#F768B0",
        "#5ED5A1",
        "#A96DE9",
        "#A27267",
        "#5B6CD9",
        "#F9C637",
        "#999999",
        "#A4DE80"
    ];

    string[] private eyeColors0 = [
        "#444444"
    ];

    string[] private dotColors0 = [
        "#FFFFFF",
        "#FEF4BA",
        "#A6FAB6",
        "#D8A0FC",
        "#858289",
        "#ACA8B2",
        "#DEDBE4",
        "#BFECFB",
        "#C3F9E7",
        "#FDCF9E",
        "#FE9496",
        "#D8A499",
        "#EEC5B0",
        "#BAC2F8",
        "#9191DF",
        "#FBC2DE",
        "#D6FCCE",
        "#E3DBF9",
        "#F8C6C9",
        "#FEEFAD"
    ];

    string[] private effectColors0 = [
        "#BE91EF",
        "#9C79FF",
        "#FF60A2",
        "#FFE298",
        "#FF976A",
        "#EEF3FF",
        "#E7EEFF",
        "#ECFFF8"
    ];

    string[] private soulColors0 = [
        "#F4F4F4",
        "#FCE779",
        "#5DEA8C",
        "#C271F9",
        "#55505C",
        "#837D8C",
        "#BBB6C2",
        "#93E0FA",
        "#7C8CF0",
        "#FB974E",
        "#F5575B",
        "#BD7668"
    ];

    string[] private soulColors1 = [
        "#F4F4F4",
        "#FCE779",
        "#5DEA8C",
        "#C271F9",
        "#55505C",
        "#837D8C",
        "#BBB6C2",
        "#93E0FA",
        "#7C8CF0",
        "#FB974E",
        "#F5575B",
        "#BD7668",
        "#FB9BA0",
        "#FB9BCB",
        "#FEDC57",
        "#6969CA",
        "#96FADA",
        "#B3FDA4",
        "#CEBFFB",
        "#E2A385"
    ];

    string[] private soulColors2 = [
        "#F4F4F4",
        "#FCE779",
        "#5DEA8C",
        "#C271F9",
        "#55505C",
        "#837D8C",
        "#BBB6C2",
        "#93E0FA",
        "#7C8CF0",
        "#FB974E",
        "#F5575B",
        "#BD7668",
        "#FB9BA0",
        "#FB9BCB",
        "#FEDC57",
        "#6969CA",
        "#96FADA",
        "#B3FDA4",
        "#CEBFFB",
        "#E2A385",
        "#FCA8E8",
        "#FDBCE3",
        "#FC71BF",
        "#FB92CF",
        "#FCDD85",
        "#F4CE5E",
        "#F0C07B",
        "#FAC162",
        "#70B8F8",
        "#73D6FD",
        "#7EA9F9",
        "#B8D6FC",
        "#9CFFC9",
        "#76ECBF",
        "#7EE5D5",
        "#84EEDE",
        "#81D3B0",
        "#C0ED75",
        "#B2FC63",
        "#D2F98E",
        "#C4A7E7",
        "#CEB0EE",
        "#D5ADE4",
        "#E5D4F4",
        "#ECC4B3",
        "#B98292",
        "#B29777",
        "#C9B38A"
    ];

    string[] private soulColors3 = [
        "#F4F4F4",
        "#FCE779",
        "#5DEA8C",
        "#C271F9",
        "#55505C",
        "#837D8C",
        "#BBB6C2",
        "#93E0FA",
        "#7C8CF0",
        "#FB974E",
        "#F5575B",
        "#BD7668",
        "#FB9BA0",
        "#FB9BCB",
        "#FEDC57",
        "#6969CA",
        "#96FADA",
        "#B3FDA4",
        "#CEBFFB",
        "#E2A385",
        "#FCA8E8",
        "#FDBCE3",
        "#FC71BF",
        "#FB92CF",
        "#FCDD85",
        "#F4CE5E",
        "#F0C07B",
        "#FAC162",
        "#70B8F8",
        "#73D6FD",
        "#7EA9F9",
        "#B8D6FC",
        "#9CFFC9",
        "#76ECBF",
        "#7EE5D5",
        "#84EEDE",
        "#81D3B0",
        "#C0ED75",
        "#B2FC63",
        "#D2F98E",
        "#C4A7E7",
        "#CEB0EE",
        "#D5ADE4",
        "#E5D4F4",
        "#ECC4B3",
        "#B98292",
        "#B29777",
        "#C9B38A",
        "#F9B4FC",
        "#F990FD",
        "#FD7497",
        "#FBEC9F",
        "#FED829",
        "#FCCB4E",
        "#9CA2EE",
        "#89B4E0",
        "#5196ED",
        "#7672E4",
        "#8FE3E5",
        "#B1FFD5",
        "#29D29A",
        "#9FDBC8",
        "#7FF43A",
        "#9FFF8B",
        "#6DA98A",
        "#7CAD76",
        "#DCA4FD",
        "#F4B2FD",
        "#EF90FD",
        "#C19AFD",
        "#C09CA7",
        "#C7B9A7",
        "#B2A0A0",
        "#8B7475",
        "#6C7362",
        "#7F8673",
        "#4F7174",
        "#5F7E81",
        "#B7BA78",
        "#AF9464",
        "#F64653",
        "#800317",
        "#B1391B",
        "#9B2A53",        
        "#87508E",
        "#6E407D"
    ];

    constructor() {
        grounds[0].push(Rect(0, 17, 24, 7));
        grounds[1].push(Rect(0, 17, 24, 8));
        grounds[1].push(Rect(0, 17, 24, 1));
        grounds[1].push(Rect(0, 18, 24, 1));
    }

    function backgroundColors(
        uint index
    ) private view returns (string[] storage) {
        if (index == 0) return backgroundColors0;
        if (index == 1) return backgroundColors0;
        if (index == 2) return backgroundColors0;
        if (index == 3) return backgroundColors0;
        return backgroundColors0;
    }

    function groundColors(uint index) private view returns (string[] storage) {
        if (index == 0) return groundColors0;
        if (index == 1) return groundColors0;
        if (index == 2) return groundColors0;
        if (index == 3) return groundColors0;
        return groundColors0;
    }

    function soulColors(
        uint index
    ) private view returns (string[] storage) {
        if (index == 0) return soulColors0;
        if (index == 1) return soulColors1;
        if (index == 2) return soulColors2;
        if (index == 3) return soulColors3;
        return soulColors0;
    }

    function eyeColors(
        uint index
    ) private view returns (string[] storage) {
        if (index == 0) return eyeColors0;
        if (index == 1) return eyeColors0;
        if (index == 2) return eyeColors0;
        if (index == 3) return eyeColors0;
        return eyeColors0;
    }

    function dotColors(
        uint index
    ) private view returns (string[] storage) {
        if (index == 0) return dotColors0;
        if (index == 1) return dotColors0;
        if (index == 2) return dotColors0;
        if (index == 3) return dotColors0;
        return dotColors0;
    }

    function effectColors(
        uint index
    ) private view returns (string[] storage) {
        if (index == 0) return effectColors0;
        if (index == 1) return effectColors0;
        if (index == 2) return effectColors0;
        if (index == 3) return effectColors0;
        return effectColors0;
    }

    function setEssences(FileData[] calldata data) external onlyOwner {
        for (uint i = 0; i < data.length; ++i) {
            FileData memory file = data[i];
            Rect[] storage storageFile = essences[file.file];
            for (uint j = 0; j < file.rects.length; ++j) {
                storageFile.push(file.rects[j]);
            }
        }
    }

    function setEffects(FileData[] calldata data) external onlyOwner {
        effects.setLayers(data);
    }

    function setBodies(FileData[] calldata data) external onlyOwner {
        bodies.setLayers(data);
    }

    function setEyes(FileData[] calldata data) external onlyOwner {
        eyes.setLayers(data);
    }

    function setDots(FileData[] calldata data) external onlyOwner {
        dots.setLayers(data);
    }

    function toString(uint value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint temp = value;
        uint digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function setBcGround(
        SoulData memory data,
        Rand memory rnd
    ) private view {
        data.background = backgroundColors(rnd.lvl().to_lvl_1()).random(rnd);
    }

    function setGround(SoulData memory data, Rand memory rnd) private view {
        data.ground = rnd.next() % groundsCount;
        data.groundColor = groundColors(rnd.lvl().to_lvl_1()).random(rnd);
    }

    function setEssences(SoulData memory data, Rand memory rnd) private view {
        data.body = rnd.next() % essences_count;  
        data.bodyColor = soulColors(rnd.lvl().to_lvl_1()).random(rnd);
    }

    function setEffect(SoulData memory data, Rand memory rnd) private view {
        data.effect = rnd.next() % effectLevelCounts[rnd.lvl().to_lvl_1()];
        data.effectColor = effectColors(rnd.lvl().to_lvl_1()).random(rnd);
    }

    function setBody(SoulData memory data, Rand memory rnd) private view {
        data.body = rnd.next() % bodyLevelCounts[rnd.lvl().to_lvl_1()];
        data.bodyColor = soulColors(rnd.lvl().to_lvl_1()).random(rnd);
    }

    function setEye(SoulData memory data, Rand memory rnd) private view {
        data.eye = rnd.next() % eyeLevelCounts[rnd.lvl().to_lvl_1()];
        data.eyeColor = eyeColors(rnd.lvl().to_lvl_1()).random(rnd);
        data.hasDots = rnd.next() % 1 == 0;
        if (data.hasDots) {
            data.dotsColor = dotColors(rnd.lvl().to_lvl_1()).random(rnd);
        }
    }

    function getSoul(
        SeedData calldata seed_data
    ) external view returns (SoulData memory) {
        Rand memory rnd = Rand(seed_data.seed, 0, seed_data.extra);
        SoulData memory data;
        data.lvl = rnd.lvl();
        setBcGround(data, rnd);
        setGround(data, rnd);
        if (data.lvl == 0) {
            setEssences(data, rnd);
        } else {
            setEffect(data, rnd);
            setBody(data, rnd);
            setEye(data, rnd);
        }
        return data;
    }

    function getSvg(
        SeedData calldata seed_data
    ) external view returns (string memory) {
        return toSvg(this.getSoul(seed_data));
    }

    function getMeta(
        SeedData calldata seed_data
    ) external view returns (string memory) {
        SoulData memory data = this.getSoul(seed_data);
        bytes memory lvl = abi.encodePacked('"level":', data.lvl.toString());
        bytes memory background = abi.encodePacked(
            ',"background":"',
            data.background,
            '"'
        );
        bytes memory ground = abi.encodePacked(
            ',"groundColor":"',
            data.groundColor,
            '"'
        );
        bytes memory effect = abi.encodePacked(
            ',"effect":',
            data.effect.toString(),
            ',"effectColor":"',
            data.effectColor,
            '"'
        );
        bytes memory body = abi.encodePacked(
            ',"body":',
            data.body.toString(),
            ',"bodyColor":"',
            data.bodyColor,
            '"'
        );
        bytes memory eye = abi.encodePacked(
            ',"eye":',
            data.eye.toString(),
            ',"eyeColor":"',
            data.eyeColor,
            '"'
        );
        bytes memory bodyDots = abi.encodePacked(
            ',"hasDots":',
            data.hasDots ? "true" : "false",
            ',"dotsColor":"',
            data.dotsColor,
            '",'
        );
        bytes memory web_text = abi.encodePacked('"web":"', web, '",');
        bytes memory description_text = abi.encodePacked(
            '"description":"',
            description,
            '"'
        );

        return
            string(
                abi.encodePacked(
                    "{",
                    lvl,
                    background,
                    ground,
                    effect,
                    body,
                    eye,
                    bodyDots,
                    web_text,
                    description_text,
                    "}"
                )
            );
    }

    function toSvg(
        SoulData memory data
    ) private view returns (string memory) {
        bytes memory svgStart = abi.encodePacked(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0",
            " ",
            toString(pixelsCount),
            " ",
            toString(pixelsCount),
            "'>"
        );

        if (data.lvl == 0) {
            return
                string(
                    abi.encodePacked(
                        svgStart,
                        backgroundSvg(data),
                        groundSvg(data),
                        bodySvg(data),
                        "</svg>"
                    )
                );
        } else {
            return
                string(
                    abi.encodePacked(
                        svgStart,
                        backgroundSvg(data),
                        groundSvg(data),
                        effectSvg(data),
                        bodySvg(data),
                        eyeSvg(data),
                        "</svg>"
                    )
                );
        }
    }

    function backgroundSvg(
        SoulData memory data
    ) private pure returns (string memory) {
        Rect memory r = Rect(0, 0, pixelsCount, pixelsCount);
        return r.toSvg(data.background);
    }

    function groundSvg(
        SoulData memory data
    ) private view returns (string memory) {
        return grounds[data.ground].toSvg(data.groundColor);
    }

    function effectSvg(
        SoulData memory data
    ) private view returns (string memory) {
        return effects[data.lvl.to_lvl_1()][data.effect].toSvg(
            data.effectColor
        );
    }

    function bodySvg(
        SoulData memory data
    ) private view returns (string memory) {
        if (data.lvl == 0) return essences[data.body].toSvg(data.bodyColor);
        return bodies[data.lvl.to_lvl_1()][data.body].toSvg(data.bodyColor);
    }

    function eyeSvg(
        SoulData memory data
    ) private view returns (string memory) {
        string memory eye = eyes[data.lvl.to_lvl_1()][data.eye].toSvg(
            data.eyeColor
        );
        if (data.hasDots) {
            string memory dotsSvg = dots[data.lvl.to_lvl_1()][data.eye].toSvg(
                data.dotsColor
            );
            return string(abi.encodePacked(dotsSvg, eye));
        } else {
            return string(eye);
        }
    }
}

