//@Facial control
// Globals
if (!LS.Globals)
  LS.Globals = {};

LS.Globals.Facial = this;

// FOUND IN FACIAL TOOLS
/*
this.headNodeName = "omarHead";
this.jawNodeName = "jaw";
this._jawInitRot = null;
this._jawRot = quat.create();
*/

// Look at
this.headBoneNodeName = "head";
this.lookAtEyesName = "lookAtEyes";
this.lookAtHeadName = "lookAtHead";
this.lookAtNeckName = "lookAtNeck";

// Head behavior
this._lookAtHeadComponent = null;


// Blend shapes index
// DEFINED IN FACIAL TOOLS
/*this.smileBSIndex = 0;
this.sadBSIndex = 1;
this.kissBSIndex = 2;
this.lipsClosedBSIndex = 3;
this.mouthAirBSIndex = 4;

this.browsDownBSIndex = 5;
this.browsInnerUpBSIndex = 6;
this.browsUpBSIndex = 7;
this.eyeLidsBSIndex = 8;
*/
//this["@eyeLidsBSIndex"] = {type: "number"};


// Blend shapes factor
// NOT NECESSARY BECAUSE WE PREDEFINE THE PIT
// USE THE SAME TOOLS TO DEFINE THE LEXEMES?
/*this.sadFactor = 1;
this.smileFactor = 1;
this.lipsClosedFactor = 1;
this.kissFactor = 1;
this.browsDownFactor = 1;
this.browsInnerUpFactor = 1;
this.browsUpFactor = 1;
this.jawFactor = 1;

this['@sadFactor'] = {type: "slider", max: 4, min: 0.1};
this['@smileFactor'] = {type: "slider", max: 4, min: 0.1};
this['@lipsClosedFactor'] = {type: "slider", max: 4, min: 0.1};
this['@kissFactor'] = {type: "slider", max: 4, min: 0.1};
this['@browsDownFactor'] = {type: "slider", max: 4, min: 0.1};
this['@browsInnerUpFactor'] = {type: "slider", max: 4, min: 0.1};
this['@browsUpFactor'] = {type: "slider", max: 4, min: 0.1};
this['@jawFactor'] = {type: "slider", max: 4, min: 0.1};
*/

// TO BE DEFINED BY FACIAL TOOLS
/*
this._facialBSW = [0,0,0,0,0,0,0,0,0];
this._FacialLexemes = [];
this._blendshapes = null;
*/
//this.activation_evaluation = [this.valence, this.arousal]
//this['@activation_evaluation'] = {type:"vec2", widget: "pad", min:-1, max: 1};

// Lipsync
/*this._audio = new Audio();
this._audio.addEventListener("canplaythrough", function(){
  console.log("Audio loaded: ", this.src, ". Duration: ", this.duration, "sec.");
  LS.Globals.Facial.playSequence();
}, false);
// Lipsync defined by user
this._lipsyncBSW = [0,0,0,0,0,0];
this.lipsyncControlNames = ["smile", "mouthAir", "lipsClosed", "lipsKiss", "sad"];

// Visemes parameters
this._visSeq = {};
this._visSeq.sequence = [];
this._visSeq.duration;
this._lastInd = 0;*/

// Lipsync
this._LS = null;

// Blink timings and variables
this.Blink = null;
this._blinking = false;

   
  
this.onStart = function(){
  
  // Initilize audio player
  //console.log("Initializing audio engine to avoid synchronization issues");
  //this._audio.src = "https://webglstudio.org/latest/fileserver/files//gerard/audios/empty.wav";
  
  
  // TO BE DEFINED BY FACIAL TOOLS
  /*
  // Get head node
  head = node.scene.getNodeByName (this.headNodeName);
  if(!head){
    console.error("Head node not found");
    return; 
  }
  
  // Get morph targets
  morphTargets = head.getComponent(LS.Components.MorphDeformer);
  
  if (!morphTargets){
    console.error("Morph deformer not found in: ", head.name);
    return; 
  }
  morphTargets = morphTargets.morph_targets;
  this._blendshapes = morphTargets;
  
  // Get eyeLidsBS
  if (this.eyeLidsBSIndex > morphTargets.length-1){
    console.error("Eye lid index", this.eyeLidsBSIndex ," is not found in: ", morphTargets);
    return; 
  }
	
  this.eyeLidsBS = morphTargets[this.eyeLidsBSIndex];
  
  
  // Get jaw node and initial rotation
  this.jaw = node.scene.getNodeByName (this.jawNodeName);
  
  if (!this.jaw){
    console.error("Jaw node not found with name: ", this.jawNodeName);
    return;
  }
  // Initial rotation
  this._jawInitRotation = vec4.copy(vec4.create(), this.jaw.transform.rotation);
  */
  
  // Lipsync
  // Get lipsync component
  if (typeof LipSyncJP !== "undefined")
    this._LS = new LipSyncJP();
  else
    console.error("LipSyncJP class doesn't extist.");
  
  
  // Gaze
  // Get head bone node
  this.headBone = node.scene.getNodeByName(this.headBoneNodeName);
  
  if (!this.headBone)
    console.error("Head bone node not found with name: ", this.headBoneNodeName);
  else
		this.gazePositions["HEAD"] = this.headBone.transform.globalPosition;
  LS.GlobalScene.getActiveCameras(true);
  if (LS.GlobalScene._cameras[0])
  	this.gazePositions["CAMERA"] = LS.GlobalScene.getCamera().getEye();
  else
    console.error("Camera position not found for gaze.");
  
  // Get lookAt nodes
  this.lookAtEyes = node.scene.getNodeByName (this.lookAtEyesName);
  this.lookAtHead = node.scene.getNodeByName (this.lookAtHeadName);
  this.lookAtNeck = node.scene.getNodeByName (this.lookAtNeckName);
  if (!this.lookAtEyes) console.error("LookAt Eyes not found with name: ", this.lookAtEyesName);
  else this.gazePositions["EYESTARGET"] = this.lookAtEyes.transform.position;
  if (!this.lookAtHead) console.error("LookAt Head not found with name: ", this.lookAtHeadName);
  else this.gazePositions["HEADARGET"] = this.lookAtHead.transform.position;
  if (!this.lookAtNeck) console.error("LookAt Neck not found with name: ", this.lookAtNeckName);
  else this.gazePositions["NECKTARGET"] = this.lookAtNeck.transform.position;

  
  // Gaze manager
  this.gazeManager = new GazeManager(this.lookAtNeck, this.lookAtHead, this.lookAtEyes, this.gazePositions);

  
  // Head behavior
  // Get lookAt head component
  this._lookAtHeadComponent = this.headBone.getComponents(LS.Components.LookAt)[0];
  if (!this._lookAtHeadComponent)
    console.error("LookAt component not found in head bone. ", this._lookAtHeadComponent, this.headBone);
  
  this.headBML = null;
  

}
  
  
 



this.onUpdate = function(dt)
{

  // Update blendshapes
  if (!this._blendshapes)// || !this.jaw)
    return;
  
  // Update facial expression
  this.faceUpdate(dt);
  
  // Face blend (blink, facial expressions, lipsync)
  this.facialBlend(dt);
  
  // Gaze
  if (this.gazeManager)
  	this.gazeManager.update(dt);
  
  // Head behavior
  this.headBMLUpdate(dt);

  
	node.scene.refresh();
}


this.onFinish = function(){
  if (this._LS)
  	if (!this._LS.audio.paused)
  		this._LS.audio.pause();
}




// --------------------- BLINK ---------------------
// BML
// <blink start attackPeak relax end amount>

LS.Globals.blink = function(blinkData, cmdId){

  blinkData.end = blinkData.end || blinkData.attackPeak * 2 || 0.5;
  
  LS.Globals.Facial.newBlink(blinkData);
  LS.Globals.Facial._blinking = true;
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), blinkData.end * 1000, cmdId + ": true");
}

// Create blink object
this.newBlink = function(blinkData){
  this.Blink = new Blink(blinkData, this.eyeLidsBS.weight);
}




// --------------------- FACIAL EXPRESSIONS ---------------------
// BML
// <face or faceShift start attackPeak relax* end* valaro
// <faceLexeme start attackPeak relax* end* lexeme amount
// <faceFacs not implemented>
// lexeme  [OBLIQUE_BROWS, RAISE_BROWS,
//      RAISE_LEFT_BROW, RAISE_RIGHT_BROW,LOWER_BROWS, LOWER_LEFT_BROW,
//      LOWER_RIGHT_BROW, LOWER_MOUTH_CORNERS,
//      LOWER_LEFT_MOUTH_CORNER,
//      LOWER_RIGHT_MOUTH_CORNER,
//      RAISE_MOUTH_CORNERS,
//      RAISE_RIGHT_MOUTH_CORNER,
//      RAISE_LEFT_MOUTH_CORNER, OPEN_MOUTH,
//      OPEN_LIPS, WIDEN_EYES, CLOSE_EYES]
//
// face/faceShift can contain several sons of type faceLexeme without sync attr
// valaro Range [-1, 1]


LS.Globals.face = function (faceData, cmdId){

  faceData.end = faceData.end || faceData.attackPeak*2 || 0.0;

  LS.Globals.Facial.newFA(faceData, false);

    // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), faceData.end * 1000, cmdId + ": true");
}

LS.Globals.faceShift = function (faceData, cmdId){

  faceData.end = faceData.end || faceData.attackPeak*2 || 0.0;

  LS.Globals.Facial.newFA(faceData, true);

    // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), faceData.end * 1000, cmdId + ": true");
}

// Declare new facial expression
this.newFA = function(faceData, shift){
  // Use BSW of the agent
  this._facialBSW[0] = this._blendshapes[this.sadBSIndex].weight / this.sadFactor; // sad
  this._facialBSW[1] = this._blendshapes[this.smileBSIndex].weight / this.smileFactor; // smile
  this._facialBSW[2] = this._blendshapes[this.lipsClosedBSIndex].weight / this.lipsClosedFactor; // lipsClosed
  this._facialBSW[3] = this._blendshapes[this.kissBSIndex].weight / this.kissFactor; // kiss
  this._facialBSW[5] = this._blendshapes[this.browsDownBSIndex].weight / this.browsDownFactor; // browsDown
  this._facialBSW[6] = this._blendshapes[this.browsInnerUpBSIndex].weight / this.browsInnerUpFactor; // browsInnerUp
  this._facialBSW[7] = this._blendshapes[this.browsUpBSIndex].weight / this.browsUpFactor; // browsUp
  //this._facialBSW[8] = this._blendshapes[this.eyeLidsBSIndex].weight; // eyeLids

	if (faceData.valaro)
  	this.FA = new FacialExpr (faceData, shift, this._facialBSW);
  else if (faceData.lexeme)
    this._FacialLexemes.push(new FacialExpr (faceData, shift, this._facialBSW));
}

// Update facial expressions
this.faceUpdate = function(dt){
  
  if (this.FA){
    // Update FA with Val Aro
    this.FA.updateVABSW( this._facialBSW , dt);

    // Remove object if transition finished
    if (!this.FA.transition){
      this.FA = null;
    }
  }
  
  // Update facial lexemes
  if (this._FacialLexemes){
    for (var i = 0; i < this._FacialLexemes.length; i++){
      if (this._FacialLexemes[i].transition)
        this._FacialLexemes[i].updateLexemesBSW(this._facialBSW, dt);
    }

    // Clean facial lexemes
    for (var i = 0; i < this._FacialLexemes.length; i++){
      if (!this._FacialLexemes[i].transition){
         this._FacialLexemes.splice(i, 1);
      }
    }
  }
  
  if (this.facialBSW){
    // Check for NaN errors
    for (var i = 0; i<this._facialBSW.length; i++){
      if (isNaN(this._facialBSW[i])){
        console.error("Updating facial expressions create NaN values! <this.faceUpdate>");
        this._facialBSW[i] = 0;
      }
    }
  }
  
}








// --------------------- LIPSYNC ---------------------

LS.Globals.lipsync = function(lipData){
  
  if (!lipData.sequence){ console.error("Viseme sequence not defined"); return}
  if (!lipData.audioURL){ console.error("Audio url not defined"); return}
  
  this._LS.visSeq.sequence = lipData.sequence;
  this._LS.audio.src = lipData.audioURL;
}

/*
this.playSequence = function()
{
  
	if (this._audio || this._visSeq){
		if (this._audio.paused){
      //console.log("Playing sequence", this._audio, this._visSeq);
			this._audio.play();
			this._visSeq.startTime = getTime();
			this._lastInd = 0;
		}
	}
}

this.updateLipsync = function(){
  
 	var lastInd = this._lastInd;
  
  // Lip-Sync sequence
  if (this._audio && this._visSeq.sequence.length){ // Both files are loaded

  	var speech = this._audio;
  	var visSeq = this._visSeq;

    
    if (!speech.paused){ // Audio is playing
  		
      var tmstmp = (getTime() - visSeq.startTime)/1000;
      
      
      // Index
      var condition = true;

      while (condition){
        
        if (visSeq.sequence[lastInd+1]){ // Audio is longer than visemes seq
          if (tmstmp >= visSeq.sequence[lastInd+1][0]){ // tmstmp is bigger than previous sample
            
            lastInd += 1;
            
            condition = !(tmstmp >= visSeq.sequence[lastInd][0] && tmstmp <= visSeq.sequence[lastInd-1][0]);
          } else
            condition = false;
          
        } else
          condition = false;
        
        
        // If there is no viseme seq at time 0
        if (tmstmp <= visSeq.sequence[0][0] && lastInd == 0){
          tmstmp = visSeq.sequence[0][0];
          condition = false;
        }
        
        
        // Timestamp is going backwards
        if (lastInd != 0){
          if (tmstmp < visSeq.sequence[lastInd][0]){
            lastInd-=1;
            condition = !(tmstmp >= visSeq.sequence[lastInd][0] && tmstmp <= visSeq.sequence[lastInd-1][0]);
          }
        }
        
        
      }
      
      var ind = lastInd;
				
      var prev;	
      var next; 
      
      
      if (visSeq.sequence[ind+1]) {
        prev = visSeq.sequence[ind];
        next = visSeq.sequence[ind+1];
      }
      // Audio is longer than visemes seq
      else {
        prev = visSeq.sequence[ind-1];
        next = visSeq.sequence[ind];
        tmstmp = next[0];
      }
      
      
      // Interpolation between samples
      var mixFactor = (tmstmp - prev[0]) / (next[0]- prev[0]);
      if (next[0] == prev[0])
        mixFactor = 1;
      
      for (var i = 0; i < this._lipsyncBSW.length; i++){
        seqWeight = prev[i+1]*(1-mixFactor) + next[i+1]*mixFactor;
        
        //if (seqWeight > 1 || seqWeight < 0 || isNaN(seqWeight)){
        if (isNaN(seqWeight)){
          console.log('Something is wrong!! -- Weight: ', seqWeight, ", Num: ", i , ",Time: ", tmstmp, ", VisSeqID: ", lastInd);
        	seqWeight = 0;
        }
        
        this._lipsyncBSW[i] = seqWeight;
      }
      

    } else
      lastInd = 0;
  }
  
}
*/

// --------------------- FACIAL BLEND ---------------------
this.facialBlend = function(dt){
  if (!this.FA || this._FacialLexemes)
    return;
  
  // Facial interpolation (low face) if audio is not playing
  if (this._audio.paused && (this.FA || this._FacialLexemes.length != 0) ){
    this._blendshapes[this.sadBSIndex].weight = this._facialBSW[0] * this.sadFactor; // sad
    this._blendshapes[this.smileBSIndex].weight = this._facialBSW[1] * this.smileFactor; // smile
    this._blendshapes[this.lipsClosedBSIndex].weight = this._facialBSW[2] * this.lipsClosedFactor; // lipsClosed
    this._blendshapes[this.kissBSIndex].weight = this._facialBSW[3] * this.kissFactor; // kiss

    quat.copy (this._jawRot, this._jawInitRotation);
    this._jawRot[3] += -this._facialBSW[4] * 0.3 * this.jawFactor; // jaw
    this.jaw.transform.rotation = quat.normalize(this._jawRot, this._jawRot);
  } 
  // Lipsync
  else if (!this._LS.audio.paused){
    this._LS.update();
    
    var jaw = this._LS.visemes[0];
    var smile = this._LS.visemes[1];
    var mouthAir = this._LS.visemes[2];
    var lipsClosed = this._LS.visemes[3];
    var lipsKiss = this._LS.visemes[4];
    var sad = this._LS.visemes[5];
    /*
    this._blendshapes[this.smileBSIndex].weight = this._lipsyncBSW[1];
    this._blendshapes[this.mouthAirBSIndex].weight = this._lipsyncBSW[2];
    this._blendshapes[this.lipsClosedBSIndex].weight = this._lipsyncBSW[3];
    this._blendshapes[this.kissBSIndex].weight = this._lipsyncBSW[4];
    this._blendshapes[this.sadBSIndex].weight = this._lipsyncBSW[5];
    
    quat.copy (this._jawRot, this._jawInitRotation);
    this._jawRot[3] += -this._lipsyncBSW[0] * 0.3; // jaw
    this.jaw.transform.rotation = quat.normalize(this._jawRot, this._jawRot);*/
  }
  // Facial interpolation (high face)
  if (this.FA || this._FacialLexemes.length != 0){
  	this._blendshapes[this.browsDownBSIndex].weight = this._facialBSW[5] * this.browsDownFactor; // browsDown
  	this._blendshapes[this.browsInnerUpBSIndex].weight = this._facialBSW[6] * this.browsInnerUpFactor; // browsInnerUp
  	this._blendshapes[this.browsUpBSIndex].weight = this._facialBSW[7] * this.browsUpFactor; // browsUp
  	this._blendshapes[this.eyeLidsBSIndex].weight = this._facialBSW[8]; // eyeLids
  }
  
  // Eye blink
  if (this._blinking && this.eyeLidsBS){
    weight = this.Blink.update(dt, this._facialBSW[8]);
    if (weight !== undefined)
    	this._blendshapes[this.eyeLidsBSIndex].weight = weight;
    if (!this.Blink.transition)
      this._blinking = false;
  }
}











// --------------------- GAZE ---------------------
// BML
// <gaze or gazeShift start ready* relax* end influence target influence offsetAngle offsetDirection>
// influence [EYES, HEAD, NECK, SHOULDER, WAIST, WHOLE, ...]
// offsetAngle relative to target
// offsetDirection (of offsetAngle) [RIGHT, LEFT, UP, DOWN, UPRIGHT, UPLEFT, DOWNLEFT, DOWNRIGHT]
// target [CAMERA, RIGHT, LEFT, UP, DOWN, UPRIGHT, UPLEFT, DOWNLEFT, DOWNRIGHT]

// "HEAD" position is added onStart
this.gazePositions = {"RIGHT": [70, 150, 70], "LEFT": [-70, 150, 70],
                      "UP": [0, 210, 70], "DOWN": [0, 70, 70],
                      "UPRIGHT": [70, 210, 70], "UPLEFT": [-70, 210, 70],
                      "DOWNRIGHT": [70, 70, 70], "DOWNLEFT": [-70, 70, 70]};



LS.Globals.gaze = function(gazeData, cmdId){

  gazeData.end = gazeData.end || 2.0;

  LS.Globals.Facial.newGaze(gazeData, false);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), gazeData.end * 1000, cmdId + ": true");
}

LS.Globals.gazeShift = function(gazeData, cmdId){

  gazeData.end = gazeData.end || 1.0;

  LS.Globals.Facial.newGaze(gazeData, true);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), gazeData.end * 1000, cmdId + ": true");
}


this.newGaze = function(gazeData, shift, gazePositions, headOnly){

  // TODO: recicle gaze in gazeManager
  this.gazeManager.newGaze(gazeData, shift, gazePositions, headOnly);
  
}













// --------------------- HEAD ---------------------
// BML
// <head start ready strokeStart stroke strokeEnd relax end lexeme repetition amount>
// lexeme [NOD, SHAKE]
// repetition cancels stroke attr
// amount how intense is the head nod? 0 to 1
LS.Globals.head = function(headData, cmdId){

	headData.end = headData.end || 2.0;

  LS.Globals.Facial.newHeadBML(headData);

  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), headData.end * 1000, cmdId + ": true");
}

// New head behavior
this.newHeadBML = function(headData){
  var lookAt = this._lookAtHeadComponent;
  if (lookAt){
    this.headBML = new HeadBML(headData, this.headBone, 
                               lookAt._initRot, lookAt._finalRotation, 
                               lookAt.limit_vertical[0], lookAt.limit_horizontal[0]);
  }
}
// Update
this.headBMLUpdate = function(dt){
  
  if (this.headBML){
    if (this.headBML.transition){
      this._lookAtHeadComponent.applyRotation = false;
      this.headBML.update(dt);
    } else
      this._lookAtHeadComponent.applyRotation = true;
  }
}

// BML
// <headDirectionShift start end target>
// Uses gazeBML
LS.Globals.headDirectionShift = function(headData, cmdId){
  headData.end = headData.end || 2.0;
  
  headData.influence = "HEAD";
  LS.Globals.Facial.newGaze(headData, true, null, true);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), headData.end * 1000, cmdId + ": true");
}













// --------------------- SPEECH ---------------------
this.newSpeech = function(speechData){
  if (speechData["_"])
    speechData.text = speechData["_"];
  this.callLGService(speechData.text, "test", undefined); 
}

this.callLGService = function(sentence, filename, language){
  filename += Math.round(Math.random()*1000);
  
  req = new XMLHttpRequest();
  sentence = encodeURIComponent(sentence);
	req.open('GET', 'https://kristina.taln.upf.edu/synthesizer-service/process?sentence='+ sentence + '&name='+ filename, true);
	//req.setRequestHeader("Content-type", "application/json;charset=UTF-8");
	req.send();


  req.onreadystatechange = function () { //Call a function when the state changes.
      if (req.readyState == 4 && req.status == 200) {
        LS.Globals.lipsync(JSON.parse(req.responseText));
        console.log(JSON.parse(req.responseText));
      }
  }
  
}
