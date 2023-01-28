const kebabToCamel = s => s.replace(/-[^0-9]/g, x=>x[1].toUpperCase()).replace(/-/g,x=>"_");

let UArr = [
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    []
]; // prev real, cur real, prev im, cur im, refractive index, generator wavelength, generator amp, generator phase, generator time

const params = {
    lightspeed: 299792458,
    intensity: 1,
    displayMode: 0,
    enableRecording: false,
    fps: 10,
    realTime: 0,
    recordingNum: 0,
    recordingTimeDelta: 1,
    simTimeDelta: 1,
    simTime: 0,
    isStarted: false,
    
    cellNumberW: 300,
    cellNumberH: 300,
    cellNumberLink: true,
    cellSizeW: 10,
    cellSizeH: 10,
    cellSizeLink: true,

    simSizeW: null,
    simSizeH: null,

    sceneMode: 0
}

const elements = {
    downloader: document.getElementById("downloader"),
    canvas: document.getElementById("canvas"),

    intensity: null,
    displayMode: null,
    enableRecording: null,
    fps: null,
    recordingTimeDelta: null,
    simTimeDelta: null,

    startButton: null,
    stopButton: null,

    cellNumberW: null,
    cellNumberH: null,
    cellNumberLink: null,

    cellSizeW: null,
    cellSizeH: null,
    cellSizeLink: null,

    simSizeW: null,
    simSizeH: null,

    sceneMode: null,

    apply: null,

    //sim_0_0
    //sim_0_1
    //...
};

{ // working with custom attributes
    var elemArr = document.querySelectorAll("*[save]");
    for(let [index, elem] of elemArr.entries()) {
        let kebabed = kebabToCamel(elem.id);
        elements[kebabed] = elem;
        if (params[kebabed] !== null) {
            setElementToLocalStorageOrDefault(elements[kebabed], kebabed, params[kebabed]);
        }
        // console.log(kebabed);
    }

    var elemArr = document.querySelectorAll("*[label]");
    for (let [index, elem] of elemArr.entries()) {
        let kebabed = kebabToCamel(elem.id);
        let l = document.createElement(`label`);
        l.htmlFor = elem.id;
        l.innerText = elem.getAttribute("label") + " ";
        let cloned = elem.cloneNode(true);
        elements[kebabed] = cloned;
        l.appendChild(cloned);
        elem.parentNode.insertBefore(l, elem);
        elem.remove();
    }

    var elemArr = document.querySelectorAll("*[reduce]");
    for (let [index, elem] of elemArr.entries()) {
        let kebabed = kebabToCamel(elem.id);
        params[`___${kebabed}_reduce`] = +elem.getAttribute("reduce");
        Object.defineProperty(params, kebabed, {
            set(a) {
                params[`___${kebabed}_value`] = a/params[`___${kebabed}_reduce`];
            },
            get() {
                return params[`___${kebabed}_value`];
            }
        });
        elem.value = +elem.value * (+elem.getAttribute("reduce"));
    }

    var elemArr = document.querySelectorAll("*[connect]");
    for (let [index, elem] of elemArr.entries()) {
        let connected = elem.getAttribute("connect").split(" ").map(v => document.getElementById(v));
        if(connected.length < 2) console.error("Error working with connecting elements: invalid attribute length at ", elemArr);
        connected.forEach((v,i,_)=>{
            v.setAttribute('old-value', v.value);
            v.addEventListener("input",_ => changeData(connected,i, elem));
        });
    }

    function changeData(arr,index,isConnectedCheckbox) {
        if(isConnectedCheckbox.checked)
            arr.forEach((v,i,_) => {
                if (i!==index) {
                    v.value = v.value/arr[index].getAttribute("old-value")*arr[index].value;
                }
            })
        arr[index].setAttribute("old-value",arr[index].value);
    }
}

{ //update simulation dismensions
    function updateSimDims() {
        elements.simSizeW.innerText = ((+elements.cellNumberW.value) * (+elements.cellSizeW.value)).toLocaleString('fr');
        elements.simSizeH.innerText = ((+elements.cellNumberH.value) * (+elements.cellSizeH.value)).toLocaleString('fr');
    } updateSimDims();
    elements.cellNumberW.addEventListener("input",_ =>updateSimDims());
    elements.cellNumberH.addEventListener("input",_ =>updateSimDims());
    elements.cellSizeW.addEventListener("input",_ =>updateSimDims());
    elements.cellSizeH.addEventListener("input",_ =>updateSimDims());
}

{ // toggle scene mode visibility
    function toggleVisibility() {
        let i = 0;
        while(true) {
            let element = document.getElementById(`sim-${i}-container`);
            if(!element) break;
            element.classList.add("hidden");
            i++;
        }
        document.getElementById(`sim-${elements.sceneMode.value}-container`)?.classList.remove("hidden");
    } toggleVisibility();
    elements.sceneMode.addEventListener("change", _=>toggleVisibility());
}

{ // apply check
    function checkInputValidity() {
        if( !+elements.cellNumberW.value ||
            !+elements.cellNumberH.value ||
            !+elements.cellSizeW.value ||
            !+elements.cellSizeH.value) return false;

        let mode = +elements.sceneMode.value;
        if(mode==="") return false;
        
        let i = 0;
        while(true) {
            let x = elements[`sim_${mode}_${i}`];
            if(!x) break;
            if(x.value==="") return false;
            i++;
        }

        return true;
    }

    function displayError(isShowing) {
        if(isShowing)
            document.getElementById('error-message').classList.remove("hidden")
        else
            document.getElementById('error-message').classList.add("hidden")
    }

    elements.apply.addEventListener('click', _ => {
        if(checkInputValidity()) {
            displayError(false);
            setParameters();
            setLocalStorage();

            document.getElementById("main-1").classList.add('hidden');
            document.getElementById("main-2").classList.remove('hidden');
            initPage2();
        } else {
            displayError(true);
        }
    });
}

function setElementToLocalStorageOrDefault(element, name, def) {
    if(typeof def === "boolean") {
        let a = window.localStorage.getItem(name);
        if (a==="") element.checked = def;
        else 
            element.checked = Boolean(+a);
    } else {
        element.value = window.localStorage.getItem(name) || def;
    }
}

function setLocalStorage() {
    Object.entries(params).forEach(([k,v]) => {
        if(k[0]==="_"&&k[1]==="_"&&k[2]==="_") {
            k = k.match(/(?<=^___).*(?=_value$)/);
            window.localStorage.setItem(k,params[k]);
        }
        window.localStorage.setItem(k,v);
    })
}

function setParameters() {
    Object.entries(elements).forEach(([k,v]) => {
        if(v.type === "checkbox") {
            params[k] = v.checked===true?1:0;
        } else if(v.value) {
            params[k] = +v.value;
        }
    });
}

//----------------------PAGE 2-------------------------------------------


var gpu;

function initPage2() {
    try {
        gpu = new GPU.GPU({/* mode:"cpu" */});
    }catch(e) {
        try {
            gpu = new GPU({/*mode:'dev'*/});
        }catch(e) {
            console.error(e);
        }
    }
        
    {
        for(let i = 0; i < params.cellNumberH; i++) {
            UArr[0][i] = [];
            UArr[1][i] = [];
            UArr[2][i] = [];
            UArr[3][i] = [];
            UArr[4][i] = [];
            UArr[5][i] = [];
            UArr[6][i] = [];
            UArr[7][i] = [];
            UArr[8][i] = [];
            for(let j = 0; j < params.cellNumberW; j++) {
                UArr[0][i][j] = 0;
                UArr[1][i][j] = 0;
                UArr[2][i][j] = 0;
                UArr[3][i][j] = 0;
                UArr[4][i][j] = generateRefrIndicies(i,j);
                UArr[5][i][j] = generateGenWavelength(i,j);
                UArr[6][i][j] = generateGenAmps(i,j);
                UArr[7][i][j] = generateGenPhases(i,j);
                UArr[8][i][j] = generatorTime(i,j);
            }
        }

        function generateRefrIndicies(i,j) {
            if (params.sceneMode === 0 || params.sceneMode === 1) {
                return 1;
            } else if (params.sceneMode === 2) {
                if(params.sim_2_2>=j*params.cellSizeW&&params.sim_2_2<=(j+1)*params.cellSizeW) {
                    if(params.sim_2_1/2>=Math.abs(i-params.cellNumberH/2)*params.cellSizeH) {
                        return 1;
                    }
                    return Infinity;
                }
            } else if (params.sceneMode === 3) {
                if(params.sim_3_3>=j*params.cellSizeW&&params.sim_3_3<=(j+1)*params.cellSizeW) {
                    if(Math.abs(i*params.cellSizeH-params.cellNumberH/2*params.cellSizeH-params.sim_3_2)<=params.sim_3_1
                    || Math.abs(i*params.cellSizeH-params.cellNumberH/2*params.cellSizeH+params.sim_3_2)<=params.sim_3_1) {
                            return 1;
                        }
                    return Infinity;
                }
            } else if (params.sceneMode === 4) {
                if(((i-params.cellNumberH/2)*params.cellSizeH)**2+((j-params.cellNumberW/4)*params.cellSizeW)**2 <= params.sim_4_1**2) {
                    return params.sim_4_2;
                }
            } else if (params.sceneMode === 5) {
                if(
                    (i*params.cellSizeH-params.sim_5_1)**2 + (j*params.cellSizeW-params.cellNumberW/2*params.cellSizeW-params.sim_5_2)**2 <= params.sim_5_1**2
                &&  (params.sim_5_1-i*params.cellSizeH)>=params.sim_5_4
                ) {
                    return params.sim_5_3;
                }
            }
            return 1;
        }

        function generateGenWavelength(i,j) {
            return params[`sim_${params.sceneMode}_0`];
        }

        function generateGenAmps(i,j) {
            if((params.sceneMode===0||params.sceneMode===2||params.sceneMode===3||params.sceneMode===4) && j === 1) {
                return 1;
            }
            if(params.sceneMode===1 && j===params.cellNumberW/2 && i===params.cellNumberH/2) {
                return 1;
            }
            if(params.sceneMode===5 && i===params.cellNumberH-2) {
                return 1;
            }
            // if(params.sceneMode===4 && j === 1 && i <= params.cellNumberH/2) {
            //     return 1;
            // }
            return 0;
        }

        function generateGenPhases(i,j) {
            return 0;
        }

        function generatorTime(i,j) {
            if(params.sceneMode===0)
                return params.sim_0_0/params.lightspeed*10;
            if(params.sceneMode===5) {
                return params.sim_0_0/params.lightspeed*20;
            }
            return 0;
        }
    }

    { // gpu functions
        nextIteration = gpu.createKernel(function(UArr,lightspeed,timestep,cellSizeH,cellSizeW,frametime) {
            // prev real, cur real, prev im, cur im, refractive index, generator wavelength, generator amp, generator phase

            let z = this.thread.z;
            let y = this.thread.y;
            let x = this.thread.x;
            let w = this.output.x;
            let h = this.output.y;

            if((x===0)||(x===(w-1))||(y===0)||(y===(h-1))) {
                return 0;
            }
            //prev values
            if(z >= 4) {
                return UArr[z][y][x];
            }
            if(z === 0 || z === 2) {
                return UArr[z+1][y][x];
            } 


            let U = UArr[z][y][x];
            let UPrev = UArr[z-1][y][x];
        
            let ULeft = UArr[z][y  ][x-1];
            let URight= UArr[z][y  ][x+1];
            let UTop  = UArr[z][y+1][x  ];
            let UBottom=UArr[z][y-1][x  ];

            let refrIndex = UArr[4][y][x];
            let genWavelen = UArr[5][y][x];
            let genAmp = UArr[6][y][x];
            let genPh = UArr[7][y][x];
            let genTime = UArr[8][y][x];

            let phase = z==3?-Math.PI/2:0;
        
            if(genTime!==0 && frametime>genTime) {
                let nnx = (genWavelen/lightspeed*refrIndex*2-frametime+genTime);
                if(nnx<0) nnx=0
                genAmp = genAmp * nnx;
            }
        
            
            let difHorizontal = (ULeft+URight-2*U);
            let difVertical = (UTop+UBottom-2*U);

            
            if(genAmp!==0)
                return genAmp*Math.cos(frametime/(genWavelen/lightspeed*refrIndex)+genPh+phase);            

            return (lightspeed**2*timestep**2/(refrIndex**2)) * (difHorizontal/(cellSizeW**2) + difVertical/(cellSizeH**2)) + 2*U - UPrev;
        }).setOutput([params.cellNumberW,params.cellNumberH,9]).setTactic('precision');

        draw = gpu.createKernel(function(UArr,intensity,mode) {
            let rpuc = UArr[0][this.thread.y][this.thread.x];
            let ruc = UArr[1][this.thread.y][this.thread.x];
            let cpuc = UArr[2][this.thread.y][this.thread.x];
            let cuc = UArr[3][this.thread.y][this.thread.x];
            let nc = UArr[4][this.thread.y][this.thread.x];
        
            if(mode===0) {
                let i = Math.sqrt(ruc**2+cuc**2)*intensity**2;
                let r = (nc-1)*0.08*intensity;
                let g = (nc-1)*0.16*intensity;
                let b = (nc-1)*0.65*intensity;
                this.color(i+r,i+g,i+b);
            } else if(mode===1) {
                let i = Math.sqrt(ruc**2+cuc**2)*intensity**2;
                this.color(i,i,i);
                //TODO time control like in scalar wave equation thingy
            } else if(mode===2) {
                this.color((nc-1)*intensity,(nc-1)*intensity,(nc-1)*intensity);
            } else if(mode===3) {
                this.color(ruc*intensity+.5,ruc*intensity+.5,ruc*intensity+.5);
            } else if(mode===4) {
                this.color(ruc**2*intensity**2,ruc**2*intensity**2,ruc**2*intensity**2);
            } else if(mode===5) {
                this.color(cuc*intensity+.5,cuc*intensity+.5,cuc*intensity+.5);
            }
        }).setOutput([params.cellNumberW,params.cellNumberH]).setGraphical(true);
    }

    {
        draw(UArr,1,0);
        elements.canvas.parentNode.replaceChild(draw.canvas,elements.canvas);
        elements.canvas = document.getElementsByTagName('canvas')[0];


        const observer = new MutationObserver((mutations, observer) => {
            var target = mutations[0].target;
            observer.disconnect();
            mutations.forEach(function(mutation) {
                if(mutation.attributeName!=="style")
                target.setAttribute(mutation.attributeName, mutation.oldValue);
            });
            observer.observe(target, {attributes: true, attributeOldValue: true});
        });

        observer.observe(elements.canvas,{attributes:true, attributeOldValue:true});
    }

    {
        elements.canvas.style.aspectRatio = `${params.cellSizeW*params.cellNumberW}/${params.cellSizeH*params.cellNumberH}`;
        window.onresize = _ =>  {
            if(window.innerHeight*params.cellSizeW*params.cellNumberW/params.cellSizeH/params.cellNumberH<=window.innerWidth) {
                elements.canvas.style.height = "95vh";
                elements.canvas.style.width = "";
            } else if(window.innerWidth*params.cellSizeH*params.cellNumberH/params.cellSizeW/params.cellNumberW<=window.innerHeight) {
                elements.canvas.style.width = "95vw";
                elements.canvas.style.height = "";
            } else {
                echo();
            }
            function echo() {
                console.log("хрю");
            }
        }; window.onresize();
    }

    {
        function mainLoop() {
            UArr =
            nextIteration(
                UArr,
                params.lightspeed,
                params.simTimeDelta,
                params.cellSizeH,
                params.cellSizeW,
                params.simTime
            );
            drawIfNeeded();
            params.simTime += params.simTimeDelta;
            if(params.isStarted)
                requestAnimationFrame(mainLoop);
        }

        function drawIfNeeded(force) {
            if(force==="draw") {
                draw(UArr,params.intensity,params.displayMode);
            }
            else if(!params.enableRecording) {
                let time = performance.now();
                if (time - params.realTime > 1000/params.fps) {
                    params.realTime = time;
                    draw(UArr,params.intensity,params.displayMode);
                }
            } else {
                if(params.simTime>params.recordingTimeDelta*params.recordingNum) {
                    draw(UArr,params.intensity,params.displayMode);
                    let s=`${params.recordingNum}`;
                    while(s.length<4) s = "0"+s;
                    elements.downloader.setAttribute('download', `sh-${s}.png`);
                    elements.downloader.setAttribute('href', elements.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
                    elements.downloader.click();
                    params.recordingNum++;
                }
            }
        }
        
        elements.startButton.onclick = _ => {
            params.isStarted = true;
            mainLoop();
        }

        elements.stopButton.onclick = _ => {
            params.isStarted = false;
        };
    }

    {
        elements.intensity.oninput = _ => {
            params.intensity=+elements.intensity.value;
            window.localStorage.setItem('inensity',params.intensity);
        }
        elements.displayMode.onchange = _ => {
            params.displayMode=+elements.displayMode.value;
            window.localStorage.setItem('displayMode',params.displayMode);
        }
        elements.enableRecording.onchange = _ => {
            params.enableRecording=elements.enableRecording.checked===true?1:0;
            window.localStorage.setItem('enableRecording',params.enableRecording);
        }
        elements.fps.onchange = _ => {
            params.fps=+elements.fps.value;
            window.localStorage.setItem('fps',params.fps);
        }
        elements.recordingTimeDelta.onchange = _ => {
            params.recordingTimeDelta=+elements.recordingTimeDelta.value;
            window.localStorage.setItem('recordingTimeDelta',params.recordingTimeDelta);
        }

    }
}

let nextIteration;
let draw;