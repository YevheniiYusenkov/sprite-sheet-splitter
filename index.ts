import './styles.css';

import imagePath from './sprites/adventurer/adventurer.png';

interface ITrack {
    name: string;
    updateRate: number;
    frames: {
        x: number,
        y: number,
        w: number,
        h: number
    }[];
}

interface ITrackMeta {
    color: Colors | string;
    timer: number;
}

interface ILog {
    expiredIn: Date;
    message: string;
    color: string;
    htmlRef: HTMLHeadingElement;
}

enum Colors {
    '#FFC500FF',
    '#7BFF00FF',
    '#FF6A00FF',
    '#00FF95FF',
    '#00FF33FF',
    '#00FFFFFF',
    '#006FFFFF',
    '#8400FFFF',
    '#FF00F2FF',
    '#FF0073FF',
    '#ff0000',
}

const image = new Image();
image.src = imagePath;

const canvasWidth = window.innerWidth;
const canvasHeight = window.innerHeight;

const defaultTrackColor = '#0048ff';

let scale = 1;

let cameraPositionX = 100;
let cameraPositionY = 100;
let cameraOffsetX = 100;
let cameraOffsetY = 100;

const keys: any = {};

let startMouseX = 0;
let startMouseY = 0;
let mouseX = 0;
let mouseY = 0;

let playAnimation = false;
let lastTime: number;
let deltaTime = 0;

let FPSTimer = 0;
let FPSUpdateRate = 100;

const logs: ILog[] = [];

let selectedTrack: string;
const tracks: ITrack[] = [];
const tracksMeta: { [key: string]: ITrackMeta } = {};

const mousePositionText = document.querySelector('#mouse_position');
const mouseInImagePositionText = document.querySelector('#mouse_in_image_position');
const cameraPositionText = document.querySelector('#camera_position');
const cameraOffsetText = document.querySelector('#camera_offset');
const scaleText = document.querySelector('#scale');
const logsContainer = document.querySelector('#log');
const gameLoopPerformanceText = document.querySelector('#game_loop_performance');
const tracksContainer = document.querySelector('#tracks_list');
const createTrackPopup = document.querySelector('#create_track_popup') as HTMLDivElement;

const uploadImageBtn = document.querySelector('#upload_image_btn') as HTMLInputElement;
uploadImageBtn.addEventListener('change', (ev) => {
    const files = uploadImageBtn?.files;
    if (files && files[0]) {
        image.src = URL.createObjectURL(files[0]);
    }
})

const createTrackForm = document.querySelector('#create_track_form') as HTMLFormElement;
if (createTrackForm) {
    createTrackForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const fields = (createTrackForm.elements as unknown) as { [key: string]: HTMLInputElement};
        const name = fields.trackName.value;

        let color: Colors | string = getFreeColor();
        if (!color) {
            logToScreen('All colors are used.', true);
            color = defaultTrackColor;
        }

        tracks.push({
            name: name,
            updateRate: parseInt(fields.trackUpdateRate.value),
            frames: [],
        })
        tracksMeta[name] = { timer: 0, color  };

        if (tracksContainer) {
            const HTMLTrackItem = document.createElement('li');
            HTMLTrackItem.style.color = color as string;

            HTMLTrackItem.appendChild(document.createTextNode(name));

            const removeBtn = document.createElement('button');
            removeBtn.style.marginLeft = '10px';
            removeBtn.onclick = () => {
                tracks.splice(tracks.findIndex(track => track.name === name), 1);
                delete tracksMeta[name];
                tracksContainer.removeChild(HTMLTrackItem);
            }
            removeBtn.innerText = 'Remove';
            HTMLTrackItem.appendChild(removeBtn);

            const selectBtn = document.createElement('button');
            selectBtn.style.marginLeft = '5px';
            selectBtn.onclick = () => {
                selectedTrack = name;
            }
            selectBtn.innerText = 'Select';
            HTMLTrackItem.appendChild(selectBtn);

            tracksContainer.appendChild(HTMLTrackItem);
        }

        if (createTrackPopup) {
            createTrackPopup.style.display = 'none';
        }

        selectedTrack = name;
    })
}

const createTrackBtn = document.querySelector('#create_track_btn');
if (createTrackBtn) {
    createTrackBtn.addEventListener('click', (_) => {
        if (createTrackPopup) {
            if (createTrackPopup.style.display === 'none' || !createTrackPopup.style.display) {
                if (createTrackForm) {
                    const fields = (createTrackForm.elements as unknown) as { [key: string]: HTMLInputElement};
                    fields.trackName.value = `track${tracks.length}`;
                }
                createTrackPopup.style.display = 'flex';
            } else {
                createTrackPopup.style.display = 'none';
            }
        }
    });
}

const cutAnimationBtn = document.querySelector('#cut_animation_btn');
if (cutAnimationBtn) {
    cutAnimationBtn.addEventListener('click', (ev) => {
        downloadTxtFile();
    });
}

const playAnimationBtn = document.querySelector('#play_animation_btn');
if (playAnimationBtn) {
    playAnimationBtn.addEventListener('click', (ev) => {
        playAnimation = !playAnimation;
        playAnimationBtn.textContent = playAnimation ? 'Stop' : 'Play';
    });
}

function logToScreen(message: string, isError = false) {
    if (logsContainer) {
        const color = isError ? '#ff2929' : '#0fff00';

        const expiredIn = new Date();
        expiredIn.setSeconds(expiredIn.getSeconds() + 3);

        const HTMLLogElement = document.createElement('h1');
        HTMLLogElement.style.color = color;
        HTMLLogElement.innerText = message;

        const log: ILog = { message, color, expiredIn, htmlRef: HTMLLogElement };
        logs.push(log);

        logsContainer.appendChild(log.htmlRef);
    }
}

function removeLog(log: HTMLHeadingElement) {
    if (logsContainer) {
        logsContainer.removeChild(log);
    }
}

function downloadTxtFile() {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(tracks)));
    element.setAttribute('download', 'example.txt');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function getFreeColor(): Colors | string {
    let isUsed = false;
    const colors = Object.values(Colors).filter((v) => isNaN(Number(v)));
    for (const color of colors) {
        for (const key in tracksMeta) {
            if (tracksMeta[key].color === color) {
                isUsed = true;
            }
        }
        if (!isUsed) {
            return color;
        } else {
            isUsed = false;
        }
    }
    return '';
}

let counter = 0;

const canvas = document.querySelector('canvas');
if (canvas) {
    document.addEventListener('keydown', (ev) => {
        keys[ev.key] = true;
        if (keys['Control'] === true && ev.key === 'z') {
            if (selectedTrack) {
                const currentTrack = tracks.find(track => track.name === selectedTrack);
                if (currentTrack?.frames?.length) {
                    currentTrack.frames.pop();
                }
            } else {
                logToScreen('No one track is selected.', true);
            }
        }
        if (keys['Escape'] === true) {
            if (createTrackPopup) {
                createTrackPopup.style.display = 'none';
            }
        }
    })

    document.addEventListener('keyup', (ev) => {
        keys[ev.key] = false;
    })

    canvas.addEventListener('mousedown', (ev) => {
        if (ev.button === 0) {
            keys.mouseleft = true;
            startMouseX = Math.trunc(ev.clientX / scale);
            startMouseY = Math.trunc(ev.clientY / scale);
            if (!keys[' ']) {
                if (tracks.length) {
                    if (selectedTrack) {
                        const currentTrack = tracks.find(track => track.name === selectedTrack);
                        if (currentTrack?.frames) {
                            currentTrack.frames.push({
                                x: Math.trunc(ev.clientX / scale) - cameraOffsetX,
                                y: Math.trunc(ev.clientY / scale) - cameraOffsetY,
                                w: 1,
                                h: 1,
                            })
                        }
                    } else {
                        logToScreen('No one track is selected.', true);
                    }
                } else {
                    logToScreen(`You need to create at least one track. (${counter})`, true);
                    counter++;
                }
            }
        }
    })

    canvas.addEventListener('mouseup', (ev) => {
        cameraPositionX = cameraOffsetX;
        cameraPositionY = cameraOffsetY;
        if (cameraPositionText) {
            cameraPositionText.innerHTML = `camera_pos X: ${cameraPositionX}, Y: ${cameraPositionY}`
        }
        if (ev.button === 0) {
            keys.mouseleft = false;
        }
    })

    document.addEventListener('mouseout', (ev) => {
        if (ev.button === 0) {
            keys.mouseleft = false;
        }
    })

    document.addEventListener('mouseleave', (ev) => {
        if (ev.button === 0) {
            keys.mouseleft = false;
        }
    })

    document.addEventListener('mouseover', (ev) => {
        if (ev.button === 0) {
            keys.mouseleft = false;
        }
    })

    canvas.addEventListener('mousemove', (ev) => {
        mouseX = Math.trunc(ev.clientX / scale);
        mouseY = Math.trunc(ev.clientY / scale);
        if (keys.mouseleft === true && keys[' '] === true) {
            cameraOffsetX = cameraPositionX + mouseX - startMouseX;
            cameraOffsetY = cameraPositionY + mouseY - startMouseY;
            if (cameraOffsetText) {
                cameraOffsetText.innerHTML = `camera_offset X: ${cameraOffsetX}, Y: ${cameraOffsetY}`;
            }
        } else if (keys.mouseleft && !playAnimation) {
            if (tracks.length) {
                if (selectedTrack) {
                    const currentTrack = tracks.find(track => track.name === selectedTrack);
                    if (currentTrack?.frames?.length) {
                        currentTrack.frames[currentTrack.frames.length - 1].w = mouseX - startMouseX;
                        currentTrack.frames[currentTrack.frames.length - 1].h = mouseY - startMouseY;
                    }
                } else {
                    logToScreen('No one track is selected.', true);
                }
            }
        }
        if (mousePositionText) {
            mousePositionText.innerHTML = `mouse_pos X: ${mouseX}, Y: ${mouseY}`;
        }
        if (mouseInImagePositionText) {
            mouseInImagePositionText.innerHTML = `mouse_ii_pos X: ${mouseX - cameraOffsetX}, Y: ${mouseY - cameraOffsetY}`;
        }
    });

    document.addEventListener('wheel', ev => {
        if (ev.deltaY < 0) {
            scale += 0.5;
        } else {
            scale -= 0.5;
        }
        scale = Math.max(0.5, scale);
        if (scaleText) {
            scaleText.innerHTML = `scale: ${scale}`;
        }
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.canvas.width = canvasWidth;
        ctx.canvas.height = canvasHeight;
        ctx.imageSmoothingEnabled = false;

        lastTime = performance.now();

        const gameLoop = () => {
            deltaTime = performance.now() - lastTime;
            if (gameLoopPerformanceText && FPSTimer >= FPSUpdateRate) {
                gameLoopPerformanceText.innerHTML = `FPS: ${Math.trunc(1000 / deltaTime)}`;
                FPSTimer = 0;
            }
            lastTime = performance.now();

            for (const key in tracksMeta) {
                tracksMeta[key].timer += deltaTime;
            }
            FPSTimer += deltaTime;

            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            if (!playAnimation) {
                ctx.drawImage(image, 0, 0, image.width, image.height, cameraOffsetX * scale, cameraOffsetY * scale, image.width * scale, image.height * scale);

                if (scale >= 7) {
                    ctx.strokeStyle = '#000';
                    for (let i = 0; i < image.width * scale; i += scale) {
                        ctx.beginPath();
                        ctx.moveTo(i + cameraOffsetX * scale, cameraOffsetY * scale);
                        ctx.lineTo(i + cameraOffsetX * scale, image.height * scale + cameraOffsetY * scale);
                        ctx.stroke();
                    }

                    for (let i = 0; i < image.height * scale; i += scale) {
                        ctx.beginPath();
                        ctx.moveTo(cameraOffsetX * scale, i + cameraOffsetY * scale);
                        ctx.lineTo(image.width * scale + cameraOffsetX * scale, i + cameraOffsetY * scale);
                        ctx.stroke();
                    }
                }

                for (const track of tracks) {
                    const meta = tracksMeta[track.name];
                    for (const frame of track.frames) {
                        if (meta) {
                            ctx.strokeStyle = (meta.color || defaultTrackColor) as string;
                        }
                        ctx.strokeRect(frame.x * scale + cameraOffsetX * scale, frame.y * scale + cameraOffsetY * scale, frame.w * scale, frame.h * scale);
                    }
                }
            }

            if (playAnimation) {
                for (const [index, track] of tracks.entries()) {
                    const frames = track.frames;
                    const meta = tracksMeta[track.name];
                    if (frames.length && meta) {
                        if (meta.timer >= track.updateRate) {
                            if (frames.length > 1) {
                                const shifted = frames.shift();
                                if (shifted) {
                                    frames.push(shifted);
                                }
                            }
                            meta.timer = 0;
                        }
                        ctx.drawImage(
                            image,
                            frames[frames.length - 1].x,
                            frames[frames.length - 1].y,
                            frames[frames.length - 1].w,
                            frames[frames.length - 1].h,
                            (cameraOffsetX + (300 * index)) * scale,
                            cameraOffsetY * scale,
                            frames[frames.length - 1].w * scale,
                            frames[frames.length - 1].h * scale
                        );
                    }
                }
            }

            for (const [index, log] of logs.entries()) {
                if (new Date() >= log.expiredIn) {
                    const removedLogs = logs.splice(index, 1);
                    if (removedLogs?.length) {
                        removeLog(removedLogs[0].htmlRef);
                    }
                }
            }

            requestAnimationFrame(gameLoop);
        }
        requestAnimationFrame(gameLoop);
    }
}