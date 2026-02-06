/* Global Variables */
let map, gridOverlay;
let canvas, ctx;
let geocoder;
let currentPlaceName = null; // Store place name from search
// word_data.js must be loaded before this file
const KAKAO_API_KEY = "c2db0ea3cf94c9b50e56b5883f54537a"; // From original file

/* Initialization */
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initMap();
    initEventListeners();
});

function initMap() {
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.4979, 127.0276), // Gangnam Station
        level: 3 // Start a bit closer
    };
    map = new kakao.maps.Map(mapContainer, mapOption);

    // Init Geocoder
    geocoder = new kakao.maps.services.Geocoder();

    // Initial Updates
    resizeCanvasToMap();
    updateCenterAddress();

    // Map Events
    kakao.maps.event.addListener(map, 'idle', () => {
        try {
            updateCenterAddress();
            updateZoomDisplay();
        } catch (e) {
            console.error("Idle update failed", e);
        }
    });

    // Reset place name on manual move
    kakao.maps.event.addListener(map, 'dragstart', () => {
        currentPlaceName = null;
    });
    kakao.maps.event.addListener(map, 'zoom_changed', () => {
        // currentPlaceName = null; // Zoom doesn't necessarily change the "center place" intent significantly, but center changes.
        // Actually idle triggers updateCenterAddress, which will re-evaluate. 
        // If we strictly want to keep "Searched Place" until moved away, dragstart is good. 
        // If center changes by zoom, coordinates change slightly or same? 
        // Let's keep place name on zoom if center behaves.
    });

    // Zoom control logic if needed, but we rely on touch/scroll
    updateZoomDisplay();
}

function initCanvas() {
    canvas = document.getElementById('grid-canvas');
    ctx = canvas.getContext('2d');

    // Handle Window Resize
    window.addEventListener('resize', () => {
        resizeCanvasToMap();
        drawCanvasGrid();
    });
}

function initEventListeners() {
    // Search
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // My Location
    document.getElementById('btn-my-location').addEventListener('click', moveToMyLocation);

    // Copy Address
    document.getElementById('address-text').addEventListener('click', copyAddressToClipboard);

    // Share Button
    document.getElementById('btn-share').addEventListener('click', shareAddress);

    // Copy Button (Secondary action)
    document.getElementById('btn-copy').addEventListener('click', copyAddressToClipboard);
}

/* Core Logic: Map & Grid */
function resizeCanvasToMap() {
    const mapContainer = document.getElementById('map');
    canvas.width = mapContainer.clientWidth;
    canvas.height = mapContainer.clientHeight;
}

function drawCanvasGrid() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const level = map.getLevel();
    if (level > 5) return; // Don't draw if zoomed out too far (Kakao level is higher -> more zoomed out?)
    // Wait, Kakao API: Level 1 is close, Level 14 is far.
    // Original code: if (level < 4) return; (Original logic seemed reversed or specific to their test?)
    // Let's stick to logic needed: Draw 10m grid only when zoomed in enough.
    // 10m grid is relevant at levels ~1-5.

    // Let's reuse original logic adapted
    if (level > 5) return; // Hide grid when too high up

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const projection = map.getProjection();

    const originLat = 33.0;
    const originLng = 124.6;
    const bigSize = 0.05; // 5.5km approx

    // We need 10m grid lines?
    // The original code was drawing a 'big grid' on canvas and a 'red rectangle' for the specific block.
    // Let's refine: We want to see the 10m grid lines around the center.

    // Original latLngToGilmaru logic:
    // small block is 0.0001 (approx 10m)
    const subBlockSize = 0.0001;

    // Optimization: Only draw lines within view
    const startX = Math.floor((sw.getLng() - originLng) / subBlockSize);
    const endX = Math.floor((ne.getLng() - originLng) / subBlockSize);
    const startY = Math.floor((sw.getLat() - originLat) / subBlockSize);
    const endY = Math.floor((ne.getLat() - originLat) / subBlockSize);

    // Limit calculation to avoid freezing if zoomed out too much (safety check)
    if ((endX - startX) * (endY - startY) > 5000) return;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical lines
    for (let x = startX; x <= endX; x++) {
        const lng = originLng + x * subBlockSize;
        const p1 = projection.containerPointFromCoords(new kakao.maps.LatLng(sw.getLat(), lng));
        const p2 = projection.containerPointFromCoords(new kakao.maps.LatLng(ne.getLat(), lng));
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y++) {
        const lat = originLat + y * subBlockSize;
        const p1 = projection.containerPointFromCoords(new kakao.maps.LatLng(lat, sw.getLng()));
        const p2 = projection.containerPointFromCoords(new kakao.maps.LatLng(lat, ne.getLng()));
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    }

    ctx.stroke();
}

function updateCenterAddress() {
    const center = map.getCenter();
    const level = map.getLevel();
    const gilmaru = latLngToGilmaru(center.getLat(), center.getLng(), level);

    // 1. Gilmaru Address
    const addressText = fullAddress(gilmaru.code);
    document.getElementById('address-text').innerHTML = `${addressText} <span class="material-icons copy-icon" style="font-size:16px; vertical-align:middle;">content_copy</span>`;

    // 2. Real Address & Place Name (Reverse Geocoding)
    updateDetailAddress(center.getLat(), center.getLng());

    drawHighlightGrid(center.getLat(), center.getLng());
    drawCanvasGrid(); // Redraw grid on move
}

function updateDetailAddress(lat, lng) {
    const placeEl = document.getElementById('place-name');
    const roadEl = document.getElementById('road-address');

    geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
            const detail = result[0];
            const roadAddr = detail.road_address ? detail.road_address.address_name : "";
            const jibunAddr = detail.address ? detail.address.address_name : "";
            const buildingName = detail.road_address && detail.road_address.building_name ? detail.road_address.building_name : "";

            // Display Address (Prefer Road, else Jibun)
            const displayAddr = roadAddr || jibunAddr;
            roadEl.textContent = displayAddr;

            // Display Place Name priorities:
            // 1. Searched Place Name (currentPlaceName)
            // 2. Building Name from Geocoder
            // 3. Region Name (if no building) - Optional, maybe too generic.

            let displayPlace = currentPlaceName || buildingName;

            if (displayPlace) {
                placeEl.textContent = displayPlace;
                placeEl.style.display = "block";
            } else {
                placeEl.style.display = "none";
            }
        } else {
            roadEl.textContent = "";
            placeEl.style.display = "none";
        }
    });
}

/* Gilmaru Logic (Ported) */
function latLngToGilmaru(lat, lng, level) {
    const originLon = 124.6;
    const originLat = 33.0;
    const blockSize = 0.05;
    const subBlockSize = 0.0001;

    const x = Math.floor((lng - originLon) / blockSize);
    const y = Math.floor((lat - originLat) / blockSize);

    const codeX = "A" + String(x + 1).padStart(3, '0');
    const codeY = "B" + String(y + 1).padStart(3, '0');

    // If zoomed out, return simplified
    /*
    if (level > 5) {
        return { code: `${codeX}.${codeY}`, x, y, gridSize: blockSize };
    }
    */

    const innerX = Math.floor(((lng - originLon) % blockSize) / subBlockSize);
    const innerY = Math.floor(((lat - originLat) % blockSize) / subBlockSize);

    const codeC = "C" + String(innerX + 1).padStart(3, '0');
    const codeD = "D" + String(innerY + 1).padStart(3, '0');

    return {
        code: `${codeX}.${codeY}.${codeC}.${codeD}`,
        x: x * 500 + innerX,
        y: y * 500 + innerY,
        gridSize: subBlockSize
    };
}

function fullAddress(code) {
    const parts = code.split(".");
    if (parts.length < 4) return "확대해서 확인하세요";
    return parts.map(getWordFromCode).join(" "); // Changed delimiter to space specifically, user might prefer dots. Let's use dots for uniqueness.
    // Actually, user example: "반달, 자리, 앞날, 하루". I will use dots for copy, render with spaces or customized.
    // Let's stick to the prompt's example format or clean format.
    // "반달 자리 앞날 하루" looks cleaner.
    // But for copying, maybe "반달.자리.앞날.하루" is more unique to this system.
    // return parts.map(getWordFromCode).join(".");
}

function getWordFromCode(code) {
    const prefix = code[0];
    const number = parseInt(code.slice(1)) - 1;
    if (prefix === 'A') return wordA[number] || "???";
    if (prefix === 'B') return wordB[number] || "???";
    if (prefix === 'C') return wordC[number] || "???";
    if (prefix === 'D') return wordD[number] || "???";
    return "???";
}

/* Helper: Highlight current 10m box */
function drawHighlightGrid(lat, lng) {
    if (window.highlightRect) window.highlightRect.setMap(null);

    const originLon = 124.6;
    const originLat = 33.0;
    const gridSize = 0.0001; // 10m

    const x = Math.floor((lng - originLon) / gridSize);
    const y = Math.floor((lat - originLat) / gridSize);

    const swLatLng = new kakao.maps.LatLng(originLat + y * gridSize, originLon + x * gridSize);
    const neLatLng = new kakao.maps.LatLng(originLat + (y + 1) * gridSize, originLon + (x + 1) * gridSize);

    window.highlightRect = new kakao.maps.Rectangle({
        bounds: new kakao.maps.LatLngBounds(swLatLng, neLatLng),
        strokeWeight: 2,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        fillColor: '#3B82F6',
        fillOpacity: 0.3
    });
    window.highlightRect.setMap(map);
}

function updateZoomDisplay() {
    const el = document.getElementById('zoom-indicator');
    if (el) el.textContent = `Zoom: ${map.getLevel()}`;
}

/* Feature: Search */
function handleSearch() {
    const keyword = document.getElementById('search-input').value.trim();
    if (!keyword) return;

    // Check if it's a Gilmaru address (Format: Word.Word.Word.Word)
    if (keyword.includes(".") || keyword.split(" ").length === 4) {
        // Assume Gilmaru Address
        currentPlaceName = null; // Reset place name as we are navigating by coordinates
        resolveGilmaruAddress(keyword);
    } else {
        // Assume Place Search
        searchPlaces(keyword);
    }
}

function searchPlaces(keyword) {
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
            const place = data[0]; // Take first result
            currentPlaceName = place.place_name; // Set place name
            const moveLatLon = new kakao.maps.LatLng(place.y, place.x);
            map.setCenter(moveLatLon);
            map.setLevel(2); // Zoom in closer
            showToast(`'${place.place_name}'(으)로 이동했습니다.`);
        } else {
            showToast("장소를 찾을 수 없습니다.");
        }
    });
}

// Reverse Geocoding (Not fully implemented without reverse index, simulating or requiring User to provide lookup logic?)
// The user prompt didn't strictly require reverse lookup implementation details in the plan, but I mentioned it.
// Without changing `word_data.js` to a map/object, reverse lookup is slow (O(N)).
// BUT arrays are small (~800 items). O(N) is instant.
function resolveGilmaruAddress(address) {
    // Expected: "반달.자리.앞날.하루" or "반달 자리 앞날 하루"
    const words = address.split(/[\.\s]/);
    if (words.length !== 4) {
        showToast("잘못된 길마루 주소 형식입니다.");
        return;
    }

    const idxA = wordA.indexOf(words[0]);
    const idxB = wordB.indexOf(words[1]);
    const idxC = wordC.indexOf(words[2]);
    const idxD = wordD.indexOf(words[3]);

    if (idxA === -1 || idxB === -1 || idxC === -1 || idxD === -1) {
        showToast("존재하지 않는 단어가 포함되어 있습니다.");
        return;
    }

    // Reconstruct Code
    // A... = idxA + 1
    // lat/lng calc reverse
    const originLon = 124.6;
    const originLat = 33.0;
    const blockSize = 0.05;
    const subBlockSize = 0.0001;

    const x = idxA; // This is actually partial. Warning: The prompt code `latLngToGilmaru` logic was:
    // codeX = "A" + (x+1)
    // index in wordA is `number`. 
    // wordA[number] is the word.
    // So idxA is the number (0-based).
    // wait. `x` in `latLngToGilmaru` is `Math.floor((lng - originLon) / blockSize)`.
    // `codeX` is "A" + String(x+1). 
    // `getWordFromCode` uses `parseInt(code.slice(1)) - 1`.
    // So `indexOf` gives us the original number directly. 

    // We need to verify if `latLngToGilmaru` x/y logic matches simple indexing.
    // Yes: getWordFromCode: `wordA[number]`. number = x.
    // So x = idxA.
    // y = idxB.
    // innerX = idxC.
    // innerY = idxD.

    const finalX = idxA * 500 + idxC; // 500 is (blockSize / subBlockSize)? 0.05 / 0.0001 = 500. Correct.
    const finalY = idxB * 500 + idxD;

    const lat = originLat + finalY * subBlockSize + (subBlockSize / 2); // Center of grid
    const lng = originLon + finalX * subBlockSize + (subBlockSize / 2);

    map.setCenter(new kakao.maps.LatLng(lat, lng));
    map.setLevel(2);
    showToast("주소 위치로 이동했습니다.");
}


/* Feature: My Location */
function moveToMyLocation() {
    if (navigator.geolocation) {
        // Show loading state?
        showToast("위치를 찾는 중...");
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            map.setCenter(new kakao.maps.LatLng(lat, lon));
            map.setLevel(2);
            showToast("현재 위치로 이동했습니다.");
        }, (err) => {
            console.error(err);
            showToast("위치 정보를 가져올 수 없습니다.");
        }, { enableHighAccuracy: true });
    } else {
        showToast("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
    }
}

/* Feature: Action Buttons */
function copyAddressToClipboard() {
    const text = document.getElementById('address-text').innerText.trim().split(" ")[0]; // Remove icon text if any
    navigator.clipboard.writeText(text).then(() => {
        showToast("주소가 복사되었습니다!");
    }).catch(() => {
        showToast("복사 실패");
    });
}

function shareAddress() {
    const text = document.getElementById('address-text').innerText.trim().split(" ")[0];
    if (navigator.share) {
        navigator.share({
            title: '길마루 주소',
            text: `내 위치: ${text}`,
            url: window.location.href
        }).then(() => console.log('Shared')).catch((error) => console.log('Sharing failed', error));
    } else {
        copyAddressToClipboard();
        showToast("공유하기를 지원하지 않아 복사되었습니다.");
    }
}

/* UI Helper: Toast */
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = "show";
    setTimeout(function () { toast.className = toast.className.replace("show", ""); }, 3000);
}
