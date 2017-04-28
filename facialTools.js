//@Facial tools
//defined: component, node, scene, globals
if (!LS.Globals)
  LS.Globals = {};

LS.Globals.FT = this;
// TODO: in facial control, correspondance of morph target names and BML and pit
// TODO: include sliders of bone transformations
// TODO: include markers for BS that are used for FacialControl and for LipSync etc...

// Pit can be defined on the scene and stored
this.pit = [];

this.faceModel = "customRomeo";
//this.faceModels = ["customRomeo", "autodeskCharGen"];

this.lipsyncModel = "threeLS";

this.showGUI = true;

//VA2BSW
this.bswPIT = {};
this._p = vec3.create();
this._pA = vec3.create();

this._weightPIT = [];



this.onStart = function()
{
  // RESET PIT FOR DEBUG PURPOSES
  this.pit = [];
  this.bswPIT = {};
  // Get morph targets
  // TODO: get bones, get multiple meshes with morph targets
  this.maxMorphPerNode = 0; //GUI
  var morphTargets = this.findMorphTargets();
  if (morphTargets.length != 0){
    this.morphTargets = morphTargets;
   	this.mtN = this.morphTargets.length;
  } else
    console.warn("Morph targets not found in children");
  
  // IDEA, if bone selected, show possiblitity to add slider. the value will go to facial control
  if (LS.Globals.Facial)
    LS.Globals.Facial._blendshapes = this.morphTargets;
  
  // Default pit
  if (this.pit.length == 0)
    this.pit = this.defineDefaultPit(this.faceModel);
  
  // Define bsw from pit
  // TODO: WATCH IF PIT0 IS NOT DEFINED
  var keysBS = Object.keys(this.pit[0]);
  for (var i = 0; i<keysBS.length; i++){
    if (keysBS[i] == "val" || keysBS[i] == "aro") continue;
    this.bswPIT[keysBS[i]] = 0;
  }
  
  
  
  // Lipsync module
  if (this.lipsyncModel == "threeLS"){
    if (typeof ThreeLS !== "undefined")
      this.LS = new ThreeLS();
  } else if (this.lipsyncModel == "LipSyncJP"){
   	if (typeof LipSyncJP !== "undefined"){
      // jawOpen: {nameBS: weight, nameBS2, weight}, mouthX: {nameBS3: weight}...
      this.LS = new LipSyncJP();
      // TODO: modify script of lipsyncing to have BSW instead of visemes
      this.LS.BSW = {jawOpen: {}, smile: {}, mouthAir: {}, lipsClosed: {}, sad:{}};
    } 
  }
  
  
}

this.onUpdate = function(dt)
{
	node.scene.refresh();
}








// FIND MORPH TARGETS
// Multiple meshes with morph targets
this.findMorphTargets = function(){
  // Find morph targets
  var morphTargetsAgent = [];
  if (node.childNodes) {
  	for (var i = 0; i<node.childNodes.length; i++){
    	// Suppose that the object with morph targets is a child
      var morphComp = node.childNodes[i].getComponent(LS.Components.MorphDeformer)
      if (morphComp !== null){
        var morphTargetsNode = morphComp.morph_targets;
        // Check maximum per node for GUI representation
        if (this.maxMorphPerNode<morphTargetsNode.length) this.maxMorphPerNode = morphTargetsNode.length;
        // Find names
        this.findMorphNames(morphTargetsNode, node.childNodes[i].name);
        // Add to morph targets array
        morphTargetsAgent = morphTargetsAgent.concat(morphTargetsNode);
      }
  	}
  }
  
  return morphTargetsAgent;
}

// Find common start string of all morph targets
this.findMorphNames = function(morphTargets, nodeName){
  if (morphTargets.length > 1){
    var stringSize = morphTargets[0].mesh.length;
    for (var i = 1; i<morphTargets.length; i++){
      var n1 = morphTargets[i-1].mesh;
      var n2 = morphTargets[i].mesh;

      while(n1.substr(0,stringSize) != n2.substr(0,stringSize)){
        stringSize-= 1;
        if (stringSize <= 0){
        	break;
        }
      }
    }
    // Now we have the common string to all morph targets. Name them.
    for (var i = 0; i<morphTargets.length; i++){
      morphTargets[i].name = morphTargets[i].mesh.substr(stringSize, morphTargets[i].mesh.length);
      morphTargets[i].node = nodeName;
    }
    
  } else if (morphTargets.length == 1) 
   morphTargets[0].name = morphTargets[0].mesh;
  else
    console.error("Something wrong in findMorphNames", morphTargets);
}






// Valence Arousal to blend shape weights
this.VA2BSW = function(valAro, pit){
  
  if (pit.length == 0)
    return [];

  limDist = 0.8;
  var BSW = this.bswPIT; // Memory saving
  var keysBS = Object.keys(pit[0]); // plus val and aro
  var numBS = keysBS.length-2;
  for (var i = 0; i<keysBS.length; i++){
    if (keysBS[i] == "val" || keysBS[i] == "aro") continue;  
    BSW[keysBS[i]] = 0;
  }
  
  
  this._p[0] = valAro[0];
  this._p[1] = valAro[1];
  this._p[2] = 0; // why vec3, if z component is always 0, like pA?

  this._pA[2] = 0;

  var cumWeight = 0;
  var cumWeightBal = 0;
  var weightV = this._weightPIT;
  var maxWeight = 0;
  
  //TODO: voronoi and delaunay
  //https://en.wikipedia.org/wiki/Delaunay_triangulation
  //http://alexbeutel.com/webgl/voronoi.html
  

  for (var i = 0; i < pit.length; i++){
    
    var pitValAro = pit[i];
    
    this._pA[0] = pitValAro.val;
    this._pA[1] = pitValAro.aro;

    var dist = vec3.dist(this._pA, this._p);
    var weight = (limDist - dist)/limDist;
    
    // If the emotion (each row is an emotion in pit) is too far away from the act-eval point, discard
    if (weight > 0){
      weightV[i] = weight;
      // Many pitValAro can be affecting
      cumWeight += weight;
      maxWeight = weight>maxWeight ? weight : maxWeight;
      
    } else {
      weightV[i] = 0;
    }
  }

  // Prioritaze closest expression
  if (cumWeight > 1){
    for (var ii = 0; ii < pit.length; ii++){
			weightV[ii] = Math.pow(weightV[ii], cumWeight);
      cumWeightBal = weightV[ii];
    }
  }

  // Balance if expressions are very close and contribute too much
  for (var ii = 0; ii < pit.length; ii++){
    var pitValAro = pit[ii];

    for (var i = 0; i < keysBS.length; i++){
			if (keysBS[i] == "val" || keysBS[i] == "aro") continue;   
      var bsName = keysBS[i];
     	if (cumWeightBal>1)
    		BSW[bsName] += pitValAro[bsName] * weightV[ii]/cumWeightBal;//this._pit[ii*bNumber +i+2] * weightV[ii]/cumWeightBal;
      else
        BSW[bsName] += pitValAro[bsName] * weightV[ii];//this._pit[ii*bNumber +i+2] * weightV[ii];
    }
  }
  
  return BSW;
}






// Default pits
this.defineDefaultPit = function(modelName){
  var pit = [];
  // TODO: create models
  if (modelName == "autodeskCharGen" && typeof PITforAutodeskCharGen != "undefined"){
		pit = new PITforAutodeskCharGen();
  } 
  // Default pit
  else if (modelName == "customRomeo" && pitForRomeoModel){
    var blendNames = {smile:"smile", sad:"sad", kiss:"kiss", lipsClosed:"lipsClosed", jaw:"jaw", 
                      browsUp:"eyebrowUp", browsDown:"eyebrowDown", browsInnerUp:"eyebrowInnerUp", eyeLids:"eyelids"};
    
    pit = new PITforRomeoModel();
  	// Find correspondance with morph target names
    this.redefineBlendNames(blendNames);
    //console.log("237line",blendNames);
    // Rename blend shapes in pit
    this.redefinePit(pit, blendNames);
    //console.log("237line",pit);

    
  } else {
    /* From Marco Romeo's thesis 
    	blend shapes:
      0 - mouth sad; 1 - mouth happy; 2 - lips closed and pressed (kiss-alike); 3 - kiss; 4 - jaw; 
      5 - eyebrows down; 6 - eyebrows rotate outwards; 7 - eyebrows up; 8 - eyelids closed
    */
    var blendNames = {smile:"smile", sad:"sad", kiss:"kiss", lipsClosed:"lipsClosed", jaw:"jaw", 
                      browsUp:"browsUp", browsDown:"browsDown", browsInnerUp:"browsInnerUp", eyeLids:"eyeLids"};
    
    pit.push({val:0, 			aro:0, 			smile: 0, sad: 0, kiss: 0, lipsClosed: 0, jaw:0, browsUp: 0, browsDown: 0, browsInnerUp: 0, eyeLids: 0});
    pit.push({val:0, 			aro:1, 			smile: 0, sad: 0, kiss: 0.344, lipsClosed: 0.344, jaw:0.7, browsUp:1, browsDown:0, browsInnerUp:0, eyeLids: -0.3});
    pit.push({val:0.5, 		aro:0.866,	smile: 1, sad: 0, kiss: 0, lipsClosed: 0, jaw:0.6, browsUp:0, browsDown:0.346, browsInnerUp:0.732, eyeLids: 0});
    pit.push({val:0.866, 	aro:0.5, 		smile: 0.7, sad: 0, kiss: 0, lipsClosed: 0, jaw:0, browsUp:0.763, browsDown:0.53, browsInnerUp:0, eyeLids: 0});
    pit.push({val:1, 			aro:0, 			smile: 1, sad: 0, kiss: 0.675, lipsClosed: 0, jaw:0, browsUp:0.116, browsDown:0, browsInnerUp:0.2, eyeLids: 0.1});
    pit.push({val:0.707, 	aro:-0.707, smile: 0, sad: 0, kiss: 0.675, lipsClosed: 0, jaw:0.3, browsUp:0.216, browsDown:0.38, browsInnerUp:0.2, eyeLids: 0.3});
    pit.push({val:0, 			aro:-1, 		smile: 0, sad: 0.5, kiss: 0, lipsClosed: 0.225, jaw:0, browsUp:0.9, browsDown:0.9, browsInnerUp:0, eyeLids: 0.5});
    pit.push({val:-0.707, aro:-0.707, smile: 0, sad: 1, kiss: 0, lipsClosed: 0, jaw:0.5, browsUp:0, browsDown:1, browsInnerUp:0, eyeLids: 0.6});
    pit.push({val:-1, 		aro:0,			smile: 0, sad: 0.527, kiss: 0.531, lipsClosed: 0.441, jaw:0, browsUp:0, browsDown:0, browsInnerUp:1, eyeLids: 0.6});
    pit.push({val:-0.866, aro:0.5,		smile: 0.527, sad: 0.920, kiss: 0.757, lipsClosed: 0, jaw:0.25, browsUp:0.366, browsDown:0.989, browsInnerUp:0, eyeLids: -0.6});
    pit.push({val:-0.5, 	aro:0.866, 	smile: 0.57, sad: 0.391, kiss: 0.462, lipsClosed: 0.591, jaw:1.0, browsUp:0, browsDown:0, browsInnerUp:0.981, eyeLids: 0}); 
  
    // Find correspondance with morph target names
    this.redefineBlendNames(blendNames);
    // Rename blend shapes in pit
    this.redefinePit(pit, blendNames);
  }
  
  // Return pit
  return pit;
}






// All this should be for sliders (bones and BS). For now BS only
// Redefine blendNames
this.redefineBlendNames = function(blendNames){
  for (i in blendNames){
    var bs = i;
    switch(bs){
      case "smile":
        blendNames[i] = this.findSimilar(["smile", "RAISE_MOUTH_CORNERS", "au12", "happy"]);
        break;
      case "sad":
        blendNames[i] = this.findSimilar(["sad", "LOWER_MOUTH_CORNERS", "au15"]);
        break;
      case "kiss":
        blendNames[i] = this.findSimilar(["kiss", "CLOSE_LIPS", "au18"]);
        break;
      case "lipsClosed":
        blendNames[i] = this.findSimilar(["lipsClosed", "lipsclo", "PRESS_LIPS", "au24"]);
        break;
      case "jaw":
        blendNames[i] = this.findSimilar(["jaw", "OPEN_MOUTH", "au26"]);
        break;
      case "browsUp", "eyebrowUp":
        blendNames[i] = this.findSimilar(["browsUp", "eyebrowUp", "eyebrowsUp", "RAISE_BROWS", "au2"]);
        break;
      case "browsDown", "eyebrowDown":
        blendNames[i] = this.findSimilar(["browsDown", "eyebrowdown", "eyebrowsdown","LOWER_BROWS", "au4"]);
        break;
      case "browsInnerUp", "eyebrowInnerUp":
        blendNames[i] = this.findSimilar(["browsInnerUp", "eyebrowsinnerup", "eyebrowinnerup", "eyebrowoutward", "eyebrowsoutward", "browsOutwards", "OBLIQUE_BROWS", "au1"]);
        break;
      case "eyeLids":
        blendNames[i] = this.findSimilar(["eyeLids", "eyeLieds", "CLOSE_EYES", "au43"]);
        break;
    }
  }
  
}
// Find a similar blend shape
this.findSimilar = function(targets){
  // No morph targets
  if (!this.morphTargets)
    return;
  // Find the corresponding blend shape
  for (var i = 0; i<targets.length; i++){
    var bsTarg = targets[i];
    for (var j = 0; j<this.morphTargets.length; j++){
      var bsName = this.morphTargets[j].name;
      // Comparison
      // Equal
      if (bsTarg.toLowerCase() == bsName.toLowerCase())
        return bsName;
      // Partial (should check all if there is an equal then partial?)
      else if (bsTarg.toLowerCase() == bsName.substring(0,bsTarg.length).toLowerCase())
        return bsName;
      // Includes
      else if (bsName.toLowerCase().includes(bsTarg.toLowerCase()))
      	return bsName;
    }
  }
  console.warn("FacialTools; findSimilar; Blend shape correspondance not found for", targets);
  return targets[0];
}


// Rename the blend shapes of the pit with the ones in the scene
this.redefinePit = function(pit, blendNames){
	var keysPit = Object.keys(pit[0]);
  var keysBN = Object.keys(blendNames);
  // Discussion: if some expressions only use some blendshapes this should be ommited.
  // Length should be the same minus val and aro
  if (keysPit.length -2 != keysBN.length) console.warn("FacialTools;redefinePit;Blend shape names do not correspond to pit;", keysPit, keysBN);
  
  for (var i = 0; i < pit.length; i++){
    var pitValAro = pit[i];
    var keysPit = Object.keys(pitValAro);
       
    for (var j = 0; j<keysBN.length; j++){
      var oldBN = keysBN[j]
      var bsweight = pitValAro[oldBN];
      delete pitValAro[oldBN]
      var newBN = blendNames[oldBN]
      pitValAro[newBN] = bsweight;
    }
  }
}













// RENDER GUI
// Facial tools to define pit
this.val = 0.00; this.aro = 0.00;
this._rect={x:0,y:0,w:0,h:0};
this._levelEdit = "";
this.onRenderGUI = function(){
  
  if (!this.showGUI)
    return;
    
  // Viewport
  var w = width = gl.viewport_data[2];
  var h = height = gl.viewport_data[3];
  var rect = this._rect;
  
  gl.start2D();
  
  if (!gl.mouse.left_button){
		this._clicked = false;
    this._clickedId = -1;
    if (!gl.mouse.right_button)
    	this._selExpr = null;
  }
  
  

  // Whissel Wheel
  var wwX = width - 160; var wwY = 160; var wwR = 150;
  var dist = Math.sqrt((-gl.mouse.x + width - wwX)*(-gl.mouse.x + width - wwX) + (-gl.mouse.y + height - wwY)*(-gl.mouse.y + height - wwY));

  
  
  // CREATE CANDIDATE AND DISPLAY EXPRESSIONS
  // Mouse inside wheel
  if (dist<wwR){
    gl.fillStyle = "rgba(255,0,0,0.8)";
    if (gl.mouse.left_button && !this._clicked){
      this._clicked = true;
      
      this._clickedId = "ww";
      // Create Candidate
      this._candidate = {};

    }
    // Delete expression
    if (gl.mouse.right_button){
      if (this._selExpr !== null){
        this.pit.splice(this._selExpr, 1);
        this._selExpr = null;
      } else if (this._candidate)
        this._candidate = null;
      else if (this._levelEdit.includes("editExpr"))
        this._levelEdit = "";
    }
    if (gl.mouse.middle_button){}
  }
  else
  	gl.fillStyle = "rgba(255,0,0,0.5)";
  
  
  
  // Clicked
  if (this._clicked && this._clickedId == "ww"){
    this.val = (gl.mouse.x - width + wwX)/wwR;
    this.aro = (gl.mouse.y - height + wwY)/wwR;

    var mag = Math.sqrt(this.val*this.val + this.aro*this.aro);
    if (mag>1){
      this.val/= mag;
    	this.aro/= mag;
    } 
    // Dragging selected expression
    if (this._selExpr !== null || this._levelEdit.includes("editExpr")){
      var numExpr = this._selExpr || this._levelEdit.split("_")[1] || 0;
      this.pit[numExpr].val = this.val;
      this.pit[numExpr].aro = this.aro;

      this._levelEdit = "editExpr_" + numExpr;
      this._candidate = null;
			// Assign and modify face
      for (var i = 0; i <this.morphTargets.length; i++){
        var bsName = this.morphTargets[i].name;
        if (this.pit[numExpr][bsName] !== undefined )
          this.morphTargets[i].weight = this.pit[numExpr][bsName];
      }
    }
    // New candidate
    if (this._candidate){
      this._candidate.val = this.val;
      this._candidate.aro = this.aro;
      
      var bsw = this.VA2BSW([this.val, this.aro], this.pit);
      
      // Assign and modify face
      for (var i = 0; i <this.morphTargets.length; i++){
        var bsName = this.morphTargets[i].name;
        if (bsw[bsName] !== undefined )
          this.morphTargets[i].weight = bsw[bsName];
      }
    }
  }
  
  gl.strokeStyle = "rgba(255,255,255,0.8)";
  gl.lineWidth = 2;
  
  gl.beginPath();
	gl.arc(width-wwX,wwY,wwR,0,2*Math.PI);
  gl.fill();
	gl.stroke();
  
  // Candidate
  if (this._clicked && this._clickedId == "ww" || this._candidate){
    gl.beginPath();
    gl.arc(width-wwX + this.val*wwR,wwY - this.aro*wwR,wwR*0.05,0,2*Math.PI);
    gl.fill();
    gl.stroke();
  }
  
  // Show val-aro text
  gl.font = "15px Arial";
  gl.fillStyle = "rgba(255,255,255,0.8)";
  gl.textAlign = "center";
  var FEText = "";
  FEText = "Arousal "+ this.aro.toFixed(2) +"\nValence "+ this.val.toFixed(2);
  gl.fillText(FEText, width - wwX, wwY + 15);
  
  
  
  // Store candidate button or Reset pit
  rect={x:w-wwX+wwR,y:wwY/4,w:150,h:20};
  // Interaction
  if (gl.mouse.x < rect.x + rect.w && gl.mouse.x > rect.x &&
      h-gl.mouse.y < rect.y + rect.h && h-gl.mouse.y > rect.y &&
      !this._clicked){
    gl.fillStyle = "rgba(255,255,255,0.5)";

    // Clicked inside
    if (gl.mouse.left_button && !this._clicked){
      this._clicked = true;
      gl.fillStyle = "rgba(0,255,0,0.8)";
      // Store candidate
      if (this._candidate){
        if (this.morphTargets){
          if (this.pit[0]){
            var keysBS = Object.keys(this.pit[0]);
            for (var i = 0; i<this.morphTargets.length; i++){
              var mt = this.morphTargets[i];
              // Look for the same name
              for (var j = 0; j<keysBS.length; j++){
                if (mt.name == keysBS[j]){
                  this._candidate[mt.name] = mt.weight;
                	delete keysBS[j]; // Optimize loop
                }
              }
              // Should include too all blendshapes with weight!=0?
            }
          } 
          // Select ones with weight!=0
          else {
            for (var i = 0; i<this.morphTargets.length; i++){
              var mt = this.morphTargets[i];
              //if (mt.weight != 0)
              	this._candidate[mt.name] = mt.weight;
            }
          }
          this.pit.push(this._candidate);
          this._candidate = null;
          // TODO: fix incongruencies of different pitValAro selected blend shapes
          // Does it make sense to have expressions that don't care about parts of the face? 
          //console.log(JSON.stringify(this.pit));
        }
           
      
      }
      // Store edit to existing expression
      else if (this._levelEdit.includes("editExpr")){
        if (this.morphTargets){
          var numExpr = this._levelEdit.split("_")[1];
          var keysBS = Object.keys(this.pit[numExpr]);
          
          for (var i = 0; i<this.morphTargets.length; i++){
            var mt = this.morphTargets[i];
            for (var j = 0; j<keysBS.length; j++){
              if (mt.name == keysBS[j]){
                this.pit[numExpr][mt.name] = mt.weight;
                delete keysBS[j]; // Optimize loop
              }
            }
          }
        }
        this._levelEdit = "";
      } 
      // Reset pit
      else {
        this.pit = [];
      }
      console.log("Number of facial expressions", this.pit.length);
    
    }
  } else
		gl.fillStyle = "rgba(255,255,255,0.3)";
  
  // Paint button
  gl.fillRect(rect.x,rect.y,rect.w,rect.h);
  // Paint text
  gl.fillStyle = "rgba(255,255,255,0.9)";
  if (this._candidate)
    gl.fillText("Store candidate", rect.x + rect.w/2, rect.y +3*rect.h/4);
  else if (this._levelEdit.includes("editExpr"))
  	gl.fillText("Store edit", rect.x + rect.w/2, rect.y +3*rect.h/4);
  else
    gl.fillText("Reset pit", rect.x + rect.w/2, rect.y +3*rect.h/4);
  
  
  
  
  // Display existing positions in pit
  if (this.pit){
    var pit = this.pit;
    
    // Check if mouse is on top
    var minDist = 0.08;
    var mouseVal = (gl.mouse.x - width + wwX)/wwR;
    var mouseAro = (gl.mouse.y - height + wwY)/wwR;
    
    
    // Display existing positions in pit
    for (var i = 0; i<this.pit.length; i++){
      var val = pit[i].val;
      var aro = pit[i].aro;
      
      var dist = Math.sqrt((mouseVal - val)*(mouseVal - val) + (mouseAro - aro)*(mouseAro - aro));
      
      gl.strokeStyle = "rgba(255,255,255,0.4)";
  		gl.lineWidth = 2;
      // Mouse over facial expression
      
      if (dist < minDist && !this._candidate && !this._levelEdit.includes("editExpr")) {
      	gl.fillStyle = "rgba(0,255,0,0.8)";
        this._selExpr = i;
      } 
      // Level edit: "editExpr(#selExpr)"
      else if (this._levelEdit.includes("editExpr")){
        if (this._levelEdit.split("_")[1] == i){
          var sinVariation = Math.sin(2*Math.PI*getTime()/1000);
          var alpha = (sinVariation*0.5+0.5)*0.5+0.5;
          gl.fillStyle = "rgba(0,255,0,"+alpha+")";
        } else gl.fillStyle = "rgba(0,255,0,0.1)";
      } else {
      	gl.fillStyle = "rgba(0,255,0,0.4)";
      }
      gl.beginPath();
      gl.arc(width-wwX + val*wwR,wwY - aro*wwR,wwR*0.04,0,2*Math.PI);
      gl.fill();
      gl.stroke();
    }
    
  }
  
  
  
  
  
  
  
  
  
  // LIPSYNC CONFIGURATION
  if (this.LS) {
    var lsKeys = Object.keys(this.LS.BSW);
    
    var maxHrect = 30;
    var startH = wwY + wwR + 100;
    var availableHeight = height - startH - 50;
    
    var hSq = Math.min(maxHrect, availableHeight/lsKeys.length);
    var wPos = 50; var wSq = 100;
    
    // Title
    gl.font = "15px Arial";
  	gl.textAlign = "center";
    gl.fillStyle = "rgba(255,255,255,0.9)";
    gl.fillText("Lipsync visemes", wPos + wSq/2, startH - 20);
    // Visemes
    gl.font = "13px Arial";
    for (var i = 0; i<lsKeys.length; i++){
      rect = {x:wPos,y:startH + i*hSq,w:wSq, h:hSq*0.75};
      
      // Interaction
      if (gl.mouse.x < rect.x + rect.w && gl.mouse.x > rect.x &&
      	h-gl.mouse.y < rect.y + rect.h && h-gl.mouse.y > rect.y &&
         !this._clicked){
    		gl.fillStyle = "rgba(255,255,255,0.5)";
        
        // Clicked inside
        if (gl.mouse.left_button && !this._clicked){
          this._clicked = true;
          this._clickedId = lsKeys[i];
        }
        /*if (gl.mouse.right_button)
          mt[i].weight = 0;*/
        
      } 
      // Clicked and dragging
      else if (this._clicked && this._clickedId == lsKeys[i]){
        gl.fillStyle = "rgba(0,255,0,0.5)";
        this.visemeCand = {};
        this.visemeCand[lsKeys[i]] = {};
        // Display current values
        var visemeBSW = this.LS[lsKeys[i]];
        var visKeys = Object.keys(visemeBSW);
        var mt = this.morphTargets;
        for (var j = 0; j<mt.length; j++){
          for (var k = 0; k<visKeys.length; k++){
						if (mt[j].name == visKeys[k])
              mt[j].weight = visemeBSW[visKeys[k]];
          }
        }
      }
      // Selected
      else if(this.visemeCand){
        if(Object.keys(this.visemeCand)[0] == lsKeys[i])
          gl.fillStyle = "rgba(0,255,0,0.3)";
        else
      		gl.fillStyle = "rgba(255,255,255,0.3)";
      } else
      	gl.fillStyle = "rgba(255,255,255,0.3)";
      
      // Paint rectangle
      gl.fillRect(rect.x,rect.y,rect.w,rect.h);
      
      // Paint text
  		gl.fillStyle = "rgba(255,255,255,0.9)";
 	 		gl.fillText(lsKeys[i], rect.x + rect.w/2, rect.y +3*rect.h/4);
    }
    
    // STORE VISEME
    // Edit viseme
    if (this.visemeCand){
      var i = lsKeys.length;
      rect = {x:wPos + wSq*1.25,y: startH - hSq,w:wSq, h:hSq*0.75};
      
      // Interaction
      if (gl.mouse.x < rect.x + rect.w && gl.mouse.x > rect.x &&
      	h-gl.mouse.y < rect.y + rect.h && h-gl.mouse.y > rect.y &&
         !this._clicked){
    		gl.fillStyle = "rgba(255,255,255,0.5)";
        
        // Clicked inside
        if (gl.mouse.left_button && !this._clicked){
          this._clicked = true;
          // STORE VISEME
          var mt = this.morphTargets;
          var visemeBS = this.LS[Object.keys(this.visemeCand)[0]];
          for (var i = 0; i<mt.length; i++){
            if (mt[i].weight != 0){
              visemeBS[mt[i].name] = mt[i].weight;
            }
          }
          this.visemeCand = null;
        }
        
      } else{
        var sinVariation = Math.sin(2*Math.PI*getTime()/1000);
        var color = sinVariation*100 + 155;
      	gl.fillStyle = "rgba(0,"+color+",0,0.5)";
      }
      
      
      // Paint rectangle
      gl.fillRect(rect.x,rect.y,rect.w,rect.h);
      // Paint text
      gl.font = "15px Arial";
      gl.textAlign = "center";
  		gl.fillStyle = "rgba(255,255,255,0.9)";
 	 		gl.fillText("Store viseme", rect.x + rect.w*0.95/2, rect.y +3*rect.h/4);
    }
  }
  
  
  
  
  
  
  
  
  
  // SHOW MORPH TARGETS
  // Morph Targets
  if (this.morphTargets){
    gl.font = "10px Arial";
  	gl.textAlign = "center";
    var mt = this.morphTargets;
    
    var hSq = Math.min(30, h*0.7/this.maxMorphPerNode);//mt.length);
    var startWminus = 300;
    var node = "";
    var prevNode = "";
    var nodeCount = 0;
    var nodeIndex = 0;
    for (var i = 0; i<mt.length; i++){
      // If multiple nodes have blend shapes
      node = mt[i].node;
      if (prevNode == "") prevNode = node; // Init
      if (node != prevNode){ nodeCount++; nodeIndex = i;}
      
      rect={x:w-startWminus - nodeCount*150*1.5,
            y:0.07*h + (i-nodeIndex)*hSq*1.25,
            w:150,h:hSq*0.75};
      
      // Interaction
      if (gl.mouse.x < rect.x + rect.w && gl.mouse.x > rect.x &&
      	h-gl.mouse.y < rect.y + rect.h && h-gl.mouse.y > rect.y &&
         !this._clicked){
    		gl.fillStyle = "rgba(255,255,255,0.5)";
        
        // Clicked inside
        if (gl.mouse.left_button && !this._clicked){
          this._clicked = true;
          this._clickedId = i;
        }
        if (gl.mouse.right_button)
          mt[i].weight = 0;
        
      } 
      // Clicked and dragging
      else if (this._clicked && this._clickedId == i){
        gl.fillStyle = "rgba(255,255,255,0.5)";
      } else
      	gl.fillStyle = "rgba(255,255,255,0.3)";
      // Paint rectangle
      
  		gl.fillRect(rect.x,rect.y,rect.w,rect.h);
      // Paint text
  		gl.fillStyle = "rgba(255,255,255,0.9)";
 	 		gl.fillText(mt[i].name + ", " + mt[i].weight.toFixed(2), rect.x + rect.w/2, rect.y +3*rect.h/4);
      // Paint slider
      gl.beginPath();
      gl.moveTo(rect.x + mt[i].weight*rect.w, rect.y);
      gl.lineTo(rect.x + mt[i].weight*rect.w, rect.y + rect.h);
      gl.strokeStyle = "rgba(255,255,255,0.9)";
      gl.stroke();
      
      // Change weight of clicked morph target
      if (this._clicked && gl.mouse.dragging && this._clickedId == i){
        mt[i].weight = (gl.mouse.x - rect.x)/(rect.w);
      }
      // Prev node name for multiple meshes with morph targets
      prevNode = node;
    }
    // Reset button
    //rect={x:w-startWminus,y:0.07*h + mt.length*hSq*1.25,w:150,h:hSq*0.75};
    rect={x:w-startWminus,y:0.07*h + this.maxMorphPerNode*hSq*1.25,w:150,h:hSq*0.75};
    gl.fillStyle = "rgba(255,255,255,0.9)";
 	  gl.fillText("RESET", rect.x + rect.w/2, rect.y +3*rect.h/4);
    gl.fillStyle = "rgba(255,255,255,0.3)";      
  	gl.fillRect(rect.x,rect.y,rect.w,rect.h);
    // Reset weights
    if (gl.mouse.x < rect.x + rect.w && gl.mouse.x > rect.x &&
        h-gl.mouse.y < rect.y + rect.h && h-gl.mouse.y > rect.y && gl.mouse.left_button){
			for (var i = 0; i<mt.length; i++){
      	mt[i].weight = 0;
    	}
  	}
      
  }
  
  gl.finish2D();
}




PITforAutodeskCharGen = function(){
	return JSON.parse('[{"val":0.006666666666666667,"aro":0.013333333333333334,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":0,"TD_I_m0":0,"RneckTension_m0":0,"RsmileClose_m0":0,"LsmileOpen_m0":0,"LbrowUp_m0":0,"LneckTension_m0":0,"RRbrowDown_m0":0,"Rnostril_m0":0,"JawCompress_m0":0,"RlipCorner_m0":0,"RbrowDown_m0":0,"Lnostril_m0":0,"LlipDown_m0":0,"S_m0":0,"ReyeOpen_m0":0,"ReyeClose_m0":0,"LeyeClose_m0":0,"MPB_Down_m0":0,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0,"LeyeOpen_m0":0,"MouthOpen_m0":0,"RlipDown_m0":0,"FV_m0":0,"KG_m0":0,"Lsquint_m0":0,"RmouthSad_m0":0,"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":0,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0,"LsmileClose_m0":0,"Ldisgust_m0":0,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0,"AO_a_m0":0,"Rpityful_m0":0,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0,"Lpityful_m0":0,"MPB_Up_m0":0,"Lblow_m0":0,"Rsquint_m0":0,"RRbrowUp_m0":0,"Rdisgust_m0":0,"LbrowDown_m0":0,"LLbrowUp_m0":0,"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0,"Lsad_m0":0,"RbrowUp_m0":0},{"val":0,"aro":1,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0.6266666666666667,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":0,"TD_I_m0":0,"RneckTension_m0":0,"RsmileClose_m0":0,"LsmileOpen_m0":0,"LbrowUp_m0":1.7933333333333332,"LneckTension_m0":0,"RRbrowDown_m0":0,"Rnostril_m0":0.98,"JawCompress_m0":0,"RlipCorner_m0":0,"RbrowDown_m0":0,"Lnostril_m0":0.9933333333333333,"LlipDown_m0":0,"S_m0":0,"ReyeOpen_m0":0.4666666666666667,"ReyeClose_m0":0,"LeyeClose_m0":0,"MPB_Down_m0":0,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0.6266666666666667,"LeyeOpen_m0":0.4666666666666667,"MouthOpen_m0":0,"RlipDown_m0":0,"FV_m0":0,"KG_m0":0,"Lsquint_m0":0,"RmouthSad_m0":0,"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":0,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0,"LsmileClose_m0":0,"Ldisgust_m0":0,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0,"AO_a_m0":0,"Rpityful_m0":0,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0,"Lpityful_m0":0,"MPB_Up_m0":0,"Lblow_m0":0,"Rsquint_m0":0,"RRbrowUp_m0":0.84,"Rdisgust_m0":0,"LbrowDown_m0":0,"LLbrowUp_m0":0.84,'+
                    '"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0,"Lsad_m0":0,"RbrowUp_m0":1.7666666666666666},{"val":1,"aro":0,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":0,"TD_I_m0":0,"RneckTension_m0":0,"RsmileClose_m0":0.88,"LsmileOpen_m0":0.6733333333333333,"LbrowUp_m0":0.8066666666666666,"LneckTension_m0":0,"RRbrowDown_m0":0,"Rnostril_m0":0,"JawCompress_m0":0,"RlipCorner_m0":0,"RbrowDown_m0":0,"Lnostril_m0":0,"LlipDown_m0":0,"S_m0":0,"ReyeOpen_m0":0,"ReyeClose_m0":0,"LeyeClose_m0":0,"MPB_Down_m0":0,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0,"LeyeOpen_m0":0,"MouthOpen_m0":0,"RlipDown_m0":0,"FV_m0":0,"KG_m0":0,"Lsquint_m0":0.12,"RmouthSad_m0":0,"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":0,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0,"LsmileClose_m0":0.88,"Ldisgust_m0":0,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0,"AO_a_m0":0,"Rpityful_m0":0,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0.6933333333333334,"Lpityful_m0":0,"MPB_Up_m0":0,"Lblow_m0":0,"Rsquint_m0":0.12666666666666668,"RRbrowUp_m0":0,"Rdisgust_m0":0,"LbrowDown_m0":0,"LLbrowUp_m0":0,"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0,"Lsad_m0":0,"RbrowUp_m0":0.8066666666666666},{"val":0.7682212795973759,"aro":0.6401843996644799,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0.46,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":0,"TD_I_m0":0,"RneckTension_m0":0,"RsmileClose_m0":0.9333333333333333,"LsmileOpen_m0":0.6466666666666666,"LbrowUp_m0":0.7666666666666667,"LneckTension_m0":0,"RRbrowDown_m0":0,"Rnostril_m0":0,"JawCompress_m0":0,"RlipCorner_m0":0,"RbrowDown_m0":0,"Lnostril_m0":0,"LlipDown_m0":0,"S_m0":0,"ReyeOpen_m0":0,"ReyeClose_m0":0,"LeyeClose_m0":0,"MPB_Down_m0":0,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0,"LeyeOpen_m0":0,"MouthOpen_m0":0.46,"RlipDown_m0":0,"FV_m0":0,"KG_m0":0,"Lsquint_m0":0,"RmouthSad_m0":0,"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":0,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0,"LsmileClose_m0":0.9333333333333333,"Ldisgust_m0":0,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0,"AO_a_m0":0,"Rpityful_m0":0,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0.6533333333333333,"Lpityful_m0":0,"MPB_Up_m0":0,"Lblow_m0":0,"Rsquint_m0":0,"RRbrowUp_m0":0.32,"Rdisgust_m0":0,"LbrowDown_m0":0,"LLbrowUp_m0":0.30666666666666664,"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0,"Lsad_m0":0,"RbrowUp_m0":0.8066666666666666},{"val":0.00529093123240946,"aro":-0.9999860029253879,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":0,"TD_I_m0":0,"RneckTension_m0":0,"RsmileClose_m0":0,"LsmileOpen_m0":0,"LbrowUp_m0":0,"LneckTension_m0":0,"RRbrowDown_m0":0,"Rnostril_m0":0,"JawCompress_m0":0,"RlipCorner_m0":0,"RbrowDown_m0":0,"Lnostril_m0":0,"LlipDown_m0":0,"S_m0":0,"ReyeOpen_m0":0,"ReyeClose_m0":0.19333333333333333,"LeyeClose_m0":0.21333333333333335,"MPB_Down_m0":0.3333333333333333,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0,"LeyeOpen_m0":0,"MouthOpen_m0":0,"RlipDown_m0":0,"FV_m0":0,"KG_m0":0,"Lsquint_m0":0.18666666666666668,"RmouthSad_m0":0.26,"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":0.24666666666666667,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0.25333333333333335,"LsmileClose_m0":0,"Ldisgust_m0":0,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0.6866666666666666,"AO_a_m0":0,"Rpityful_m0":0.4533333333333333,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0,"Lpityful_m0":0.44666666666666666,"MPB_Up_m0":0.22,"Lblow_m0":0,"Rsquint_m0":0.2,"RRbrowUp_m0":0,"Rdisgust_m0":0,"LbrowDown_m0":0,"'+
                    'LLbrowUp_m0":0,"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0.4,"Lsad_m0":0,"RbrowUp_m0":0},{"val":0.7358012193427397,"aro":-0.6771975824039375,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":0,"TD_I_m0":0,"RneckTension_m0":0,"RsmileClose_m0":0.6866666666666666,"LsmileOpen_m0":0.06222086638349163,"LbrowUp_m0":0.074541830023787,"LneckTension_m0":0,"RRbrowDown_m0":0,"Rnostril_m0":0,"JawCompress_m0":0,"RlipCorner_m0":0,"RbrowDown_m0":0,"Lnostril_m0":0,"LlipDown_m0":0,"S_m0":0,"ReyeOpen_m0":0,"ReyeClose_m0":0.0001282442991569747,"LeyeClose_m0":0.00014151095079390313,"MPB_Down_m0":0.0002211108606154736,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0,"LeyeOpen_m0":0,"MouthOpen_m0":0,"RlipDown_m0":0,"FV_m0":0,"KG_m0":0,"Lsquint_m0":0.011212689358210499,"RmouthSad_m0":0.00017246647128006944,"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":0.00016362203685545048,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0.00016804425406775997,"LsmileClose_m0":0.6733333333333333,"Ldisgust_m0":0,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0.0004554883728678756,"AO_a_m0":0,"Rpityful_m0":0.5333333333333333,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0.06406901092953593,"Lpityful_m0":0.5266666666666666,"MPB_Up_m0":0.0001459331680062126,"Lblow_m0":0,"Rsquint_m0":0.011837581974649888,"RRbrowUp_m0":0,"Rdisgust_m0":0,"LbrowDown_m0":0,"LLbrowUp_m0":0,"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0.00026533303273856834,"Lsad_m0":0,"RbrowUp_m0":0.074541830023787},{"val":-1,"aro":0,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":1,"TD_I_m0":0,"RneckTension_m0":0,"RsmileClose_m0":0,"LsmileOpen_m0":0,"LbrowUp_m0":0,"LneckTension_m0":0,"RRbrowDown_m0":1.0066666666666666,"Rnostril_m0":0.9866666666666667,"JawCompress_m0":0,"RlipCorner_m0":0,"RbrowDown_m0":0,"Lnostril_m0":0.9666666666666667,"LlipDown_m0":0,"S_m0":0,"ReyeOpen_m0":0,"ReyeClose_m0":0,"LeyeClose_m0":0,"MPB_Down_m0":0.5333333333333333,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0,"LeyeOpen_m0":0,"MouthOpen_m0":0,"RlipDown_m0":0,"FV_m0":0,"KG_m0":0,"Lsquint_m0":0.12,"RmouthSad_m0":0.9933333333333333,'+
                    '"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":1.0133333333333334,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0,"LsmileClose_m0":0,"Ldisgust_m0":0.26,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0.9866666666666667,"AO_a_m0":0,"Rpityful_m0":0.98,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0,"Lpityful_m0":0.9866666666666667,"MPB_Up_m0":0.98,"Lblow_m0":0,"Rsquint_m0":0.14,"RRbrowUp_m0":0,"Rdisgust_m0":0.24,"LbrowDown_m0":0,"LLbrowUp_m0":0,"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0,"Lsad_m0":0,"RbrowUp_m0":0},{"val":-0.7317215709199387,"aro":-0.6816036551035045,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0.11333333333333333,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":1,"TD_I_m0":0,"RneckTension_m0":0.9866666666666667,"RsmileClose_m0":0,"LsmileOpen_m0":0,"LbrowUp_m0":0,"LneckTension_m0":0.9866666666666667,"RRbrowDown_m0":0.9933333333333333,"Rnostril_m0":0.8733333333333333,"JawCompress_m0":0,"RlipCorner_m0":0,"RbrowDown_m0":0.9866666666666667,"Lnostril_m0":0.8666666666666667,"LlipDown_m0":0,"S_m0":0,"ReyeOpen_m0":0,"ReyeClose_m0":0,"LeyeClose_m0":0,"MPB_Down_m0":0,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0.12,"LeyeOpen_m0":0,"MouthOpen_m0":0,"RlipDown_m0":0,"FV_m0":0,"KG_m0":0,"Lsquint_m0":0.2,"RmouthSad_m0":0.4866666666666667,"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":0.49333333333333335,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0,"LsmileClose_m0":0,"Ldisgust_m0":1.0133333333333334,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0,"AO_a_m0":0,"Rpityful_m0":0,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0,"Lpityful_m0":0,"MPB_Up_m0":0,"Lblow_m0":0,"Rsquint_m0":0.22,"RRbrowUp_m0":0,"Rdisgust_m0":0.9933333333333333,"LbrowDown_m0":1.0066666666666666,"LLbrowUp_m0":0,"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0,"Lsad_m0":0,"RbrowUp_m0":0},{"val":-0.7225065746934279,"aro":0.6913640499221595,"t_FV_m0":0,"t_UH_OO_m0":0,"t_AE_AA_m0":0,"t_JawCompress_m0":0,"CurlUp_Out_tg_m0":0,"t_S_m0":0,"Right_In_tg_m0":0,"t_Ljaw_m0":0,"CurlDown_Out_tg_m0":0,"t_UW_U_m0":0,"RRR_In_tg_m0":0,"t_Ax_E_m0":0,"t_MPB_m0":0,"Left_In_tg_m0":0,"LLL_In_tg_m0":0,"Up_tg_m0":0,"t_Shout_m0":0.5133333333333333,"t_Chew_m0":0,"t_JawFront_m0":0,"t_AO_a_m0":0,"Throat_In_tg_m0":0,"t_KG_m0":0,"t_SH_CH_m0":0,"t_H_EST_m0":0,"Compress_tg_m0":0,"CurlLeft_Out_tg_m0":0,"CurlRight_Out_tg_m0":0,"OutMiddle_tg_m0":0,"t_MouthOpen_m0":0,"t_TD_I_m0":0,"t_Rjaw_m0":0,"LlipSide_m0":0,"LLbrowDown_m0":0.16,"TD_I_m0":0,"RneckTension_m0":0,"RsmileClose_m0":0,"LsmileOpen_m0":0,"LbrowUp_m0":0.45582169319532817,"LneckTension_m0":0,"RRbrowDown_m0":0.7466666666666667,"Rnostril_m0":0.24909215204354365,"JawCompress_m0":0.18,"RlipCorner_m0":0,"RbrowDown_m0":0,"Lnostril_m0":0.2524811609148844,"LlipDown_m0":0.4866666666666667,"S_m0":0,"ReyeOpen_m0":0.29333333333333333,"ReyeClose_m0":0,"LeyeClose_m0":0,"MPB_Down_m0":0,"LlipCorner_m0":0,"H_EST_m0":0,"Ljaw_m0":0,"Chew_m0":0,"Shout_m0":0.5133333333333333,"LeyeOpen_m0":0.2866666666666667,"MouthOpen_m0":0,"RlipDown_m0":0.49333333333333335,"FV_m0":0,"KG_m0":0,"Lsquint_m0":-0.20666666666666667,"RmouthSad_m0":0,"Kiss_m0":0,"RlowLid_m0":0,"LmouthSad_m0":0,"JawFront_m0":0,"RlipSide_m0":0,"AE_AA_m0":0,"LlowLid_m0":0,"RlipUp_m0":0,"UH_OO_m0":0,"Rsad_m0":0,"LsmileClose_m0":0,"Ldisgust_m0":0.47333333333333333,"SH_CH_m0":0,"UW_U_m0":0,"Chin_m0":0,"AO_a_m0":0,"Rpityful_m0":1,"LlipUp_m0":0,"Rblow_m0":0,"RsmileOpen_m0":0,"Lpityful_m0":0.9933333333333333,"MPB_Up_m0":0,"Lblow_m0":0,"Rsquint_m0":-0.2,"RRbrowUp_m0":0.213507558894466,"Rdisgust_m0":0,"LbrowDown_m0":0,"LLbrowUp_m0":0.213507558894466,"Glotis_m0":0,"Ax_E_m0":0,"Rjaw_m0":0,"Lsad_m0":0,"RbrowUp_m0":0.44904367545264673}]');
};


PITforRomeoModel = function(){
	return JSON.parse('[{"val":0,"aro":0,"smile":0,"sad":0,"kiss":0,"lipsClosed":0,"jaw":0,"browsUp":0,"browsDown":0,"browsInnerUp":0,"eyeLids":0},{"val":0,"aro":1,"smile":0,"sad":0,"kiss":0.344,"lipsClosed":0.344,"jaw":0.7,"browsUp":1,"browsDown":0,"browsInnerUp":0,"eyeLids":-0.3},{"val":0.5,"aro":0.866,"smile":1,"sad":0,"kiss":0,"lipsClosed":0,"jaw":0.6,"browsUp":0,"browsDown":0.346,"browsInnerUp":0.732,"eyeLids":0},{"val":0.866,"aro":0.5,"smile":0.7,"sad":0,"kiss":0,"lipsClosed":0,"jaw":0,"browsUp":0.763,"browsDown":0.53,"browsInnerUp":0,"eyeLids":0},{"val":0.9999797158186168,"aro":-0.006369297552984821,"smile":0.62,"sad":0,"kiss":0.38666666666666666,"lipsClosed":0,"jaw":0,"browsUp":0.116,"browsDown":0,"browsInnerUp":0.2,"eyeLids":0.1},{"val":0.707,"aro":-0.707,"smile":0,"sad":0,"kiss":0.675,"lipsClosed":0,"jaw":0.3,"browsUp":0.216,"browsDown":0.38,"browsInnerUp":0.2,"eyeLids":0.3},{"val":0.006134853874888963,"aro":-0.999981181606901,"smile":0,"sad":0.07333333333333333,"kiss":0,"lipsClosed":0.6933333333333334,"jaw":0,"browsUp":-0.3466666666666667,"browsDown":0,"browsInnerUp":0.25333333333333335,"eyeLids":0.5},{"val":-0.707,"aro":-0.707,"smile":0,"sad":1,"kiss":0,"lipsClosed":0,"jaw":0.5,"browsUp":0,"browsDown":1,"browsInnerUp":0,"eyeLids":0.6},{"val":-1,"aro":0,"smile":0,"sad":0.86,"kiss":0.09333333333333334,"lipsClosed":0.441,"jaw":0,"browsUp":-0.29333333333333333,"browsDown":0,"browsInnerUp":0.9,"eyeLids":0.3466666666666667},{"val":-0.866,"aro":0.5,"smile":0.527,"sad":0.92,"kiss":0.757,"lipsClosed":0,"jaw":0.25,"browsUp":0.366,"browsDown":0.989,"browsInnerUp":0,"eyeLids":-0.6},{"val":-0.5,"aro":0.866,"smile":0.57,"sad":0.391,"kiss":0.462,"lipsClosed":0.591,"jaw":1,"browsUp":0,"browsDown":0,"browsInnerUp":0.981,"eyeLids":0}]');
};
