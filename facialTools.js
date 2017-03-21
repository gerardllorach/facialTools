//@Facial tools
//defined: component, node, scene, globals
if (!LS.Globals)
  LS.Globals = {};

this.pit = [];

this.showGUI = true;

//VA2BSW
this._p = vec3.create();
this._pA = vec3.create();
this._BSW = [];
this._weightBSW = [];


// LipSync JP
if (typeof LipSyncJP !== "undefined"){
  // jawOpen: {nameBS: weight, nameBS2, weight}, mouthX: {nameBS3: weight}...
  this.LS = {jawOpen: {}, smile: {}, mouthAir: {}, lipsClosed: {}, sad:{}};
}

this.onStart = function()
{
  
  // Get morph targets
  // TODO: get bones, get multiple meshes with morph targets
  var morphTargets = this.findMorphTargets();
  if (morphTargets){
    this.morphTargets = morphTargets;
   	this.pitN = this.morphTargets.length;
    // Init WW vectors
    for (var i = 0; i<this.pitN; i++){ this._BSW[i] = 0; this._weightBSW[i] = 0;}
  }
  
  // IDEA, if bone selected, show possiblitity to add slider. the value will go to facial control
  if (LS.Globals.Facial)
    LS.Globals.Facial._blendshapes = this.morphTargets;
  
  // Default pit for sara
  if (this.pit.length == 0)
    this.pit = this.defineDefaultPit(node.name);
  
  
  
}

this.onUpdate = function(dt)
{
	node.scene.refresh();
}








// FIND MORPH TARGETS
// Multiple meshes with morph targets
this.findMorphTargets = function(){
  // Find morph targets
  var morphTargets = false;
  if (node.childNodes) {
  	for (var i = 0; i<node.childNodes.length; i++){
    	// Suppose that the object with morph targets is a child
      var morphComp = node.childNodes[i].getComponent(LS.Components.MorphDeformer)
      if (morphComp !== null){
        morphTargets = morphComp.morph_targets;
        // Find names
        this.findMorphNames(morphTargets);
        
        break;
      }
  	}
  }
  
  return morphTargets;
}

// Find common start string of all morph targets
this.findMorphNames = function(morphTargets){
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
    }
    
  } else if (morphTargets.length == 1) 
   morphTargets[0].name = morphTargets[0].mesh;
  else
    console.error("Something wrong in findMorphNames", morphTargets);
}







this.VA2BSW = function(valAro, pit, pitN){
  
  limDist = 0.8;
  var BSW = this._BSW;
  for (var i = 0; i<pitN; i++) BSW[i] = 0;
  
  var bNumber = pitN + 2;
  this._pit = pit;
  
  this._p[0] = valAro[0];
  this._p[1] = valAro[1];
  this._p[2] = 0; // why vec3, if z component is always 0, like pA?

  this._pA[2] = 0;

  var cumWeight = 0;
  var cumWeightBal = 0;
  var weightV = this._weightBSW;
  var maxWeight = 0;
  
  
  for (var count = 0; count < this._pit.length/bNumber; count++){
    
    this._pA[0] = this._pit[count*bNumber];
    this._pA[1] = this._pit[count*bNumber+1];
    
    var dist = vec3.dist(this._pA, this._p);
    var weight = (limDist - dist)/limDist;
    
    // If the emotion (each row is an emotion in pit) is too far away from the act-eval point, discard
    if (weight > 0){
      weightV[count] = weight;
      cumWeight += weight;
      maxWeight = weight>maxWeight ? weight : maxWeight;
    } else {
      weightV[count] = 0;
    }
  }
  
  // Prioritaze closest expression
  if (cumWeight > 1){
    for (var ii = 0; ii < this._pit.length/bNumber; ii++){
			weightV[ii] = Math.pow(weightV[ii], cumWeight);
      cumWeightBal = weightV[ii];
    }
  }
  
  // Balance if expressions are very close and contribute too much
  for (var ii = 0; ii < this._pit.length/bNumber; ii++){
    for (var i = 0; i < bNumber-2; i++){
     	if (cumWeightBal>1)
    		BSW[i] += this._pit[ii*bNumber +i+2] * weightV[ii]/cumWeightBal;
      else
        BSW[i] += this._pit[ii*bNumber +i+2] * weightV[ii];
    }
  }
  
  return BSW;

}







// Default pits
this.defineDefaultPit = function(nodeName){
  if (nodeName == "sara.dae"){
    return [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0977948675757803,0.9952065935652937,1.1933333333333334,0,0.78,0,0.8733333333333333,0,0.36666666666666664,0,0,0,0.16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.13333333333333333,0,0,0.7488937172321077,-0.6626901238816493,-0.29333333333333333,0,0.03348783257000651,0,0.0010934239655897514,0.002186847931179503,0.018040118727995783,0,0,0,0.0000031146556245799503,0,0.07033419956209752,0,0,0,0,0,0,0,0,0.03722104161741757,0.9066666666666666,0.002021177633362874,0,0,0,0,0.19333333333333333,0,0,-0.7066666666666667,0.6933333333333334,-0.14,0,1.2666666666666666,0,0.20666666666666667,0,0.44,0,0,0,0,0,0.6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.12,0,0,-0.98,0,0,0.6466666666666666,0.5666666666666667,0.4533333333333333,0.011311579059591466,0,0.024082716707517316,0,0,0.54,0.16,-0.04,-0.09333333333333334,0,0,0,0,0,0,-0.02666666666666667,0,0,0,0,0,0,0.5133333333333333,0.5733333333333334,0.12,0,0,-0.6757246285173463,-0.7371541402007414,0.6333333333333333,0,0,0.64,0,0,0,0,0,0,0,0,1.2333333333333334,0.4666666666666667,0,0,0,0,0,0,0,0,0,0,0,0,0.28,0,0,0.41333333333333333,0.38666666666666666,0.019476824194835866,-0.9998103086682412,-0.08,0,0.19333333333333333,0.31333333333333335,0.07333333333333333,-0.09333333333333334,0,0,0,0,0.16,0,0.0876215344175895,0.033154094103952786,0,0,0,0,0,0,0,0,0,0,0,0,0.62,0,0.19333333333333333,0.3466666666666667,0.34,0.9999861498722319,0.005263084999327537,0.17333333333333334,0,0.41333333333333333,0,0.00011810519549431978,0.00023621039098863957,0.0019485870222000297,0,0,0,3.3642669542192594e-7,0,0.18666666666666668,0,0,0,0,0,0,0,0,0.00402039696866922,0.8866666666666667,0,0,0,0,0,0.020882724219956354,0,0,0.766647966540689,0.6420676719778271,0.26666666666666666,0,0.26666666666666666,0,0.4266666666666667,0.35333333333333333,0.020300998360153276,0,0,0,0.008729220694527952,0,0.028418013918050534,0,0,0,0,0,0,0,0,0.0006120626625628397,0.25333333333333335,0,0.98,0,0,0,-0.004095135321568162,0,0]
  }
}









// RENDER GUI
// Facial tools to define pit
this.val = 0.00; this.aro = 0.00;
this._rect={x:0,y:0,w:0,h:0};
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
    	this._candidate = [];
    }
    // Delete expression
    if (gl.mouse.right_button){
      if (this._selExpr !== null){
        this.pit.splice(this._selExpr*(this.pitN+2), this.pitN+2);
        this._selExpr = null;
        
      } else if (this._candidate)
        this._candidate = null;
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
    
    if (this._selExpr !== null){
      this.pit[this._selExpr*(this.pitN+2)] = this.val;
      this.pit[this._selExpr*(this.pitN+2)+1] = this.aro;
      this._candidate = null;
    }
    if (this._candidate){
      this._candidate[0] = this.val;
    	this._candidate[1] = this.aro;
      var bsw = this.VA2BSW([this.val, this.aro], this.pit, this.pitN);
      for (var i = 0; i <this.pitN; i++){
        this.morphTargets[i].weight = bsw[i];
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
        if (this.pit && this.morphTargets){
          this.pit.push(this.val);
          this.pit.push(this.aro);
          for (var i = 0; i<this.morphTargets.length; i++)
            this.pit.push(this.morphTargets[i].weight);
          this._candidate = null;
          console.log(JSON.stringify(this.pit));
        }
      // Reset pit
      }else {
        this.pit = [];
      }
        
      console.log("Number of facial expressions", this.pit.length/(this.pitN+2));
    }
  } else
		gl.fillStyle = "rgba(255,255,255,0.3)";
  
  // Paint button
  gl.fillRect(rect.x,rect.y,rect.w,rect.h);
  // Paint text
  gl.fillStyle = "rgba(255,255,255,0.9)";
  if (this._candidate)
    gl.fillText("Store candidate", rect.x + rect.w/2, rect.y +3*rect.h/4);
  else
    gl.fillText("Reset pit", rect.x + rect.w/2, rect.y +3*rect.h/4);
  
  
  
  
  // Display existing positions in pit
  if (this.pit && this.pitN){
    var pit = this.pit;
    var pitN = this.pitN;
    
    // Check if mouse is on top
    var minDist = 0.08;
    var mouseVal = (gl.mouse.x - width + wwX)/wwR;
    var mouseAro = (gl.mouse.y - height + wwY)/wwR;
    
    
    // Display existing positions in pit
    for (var i = 0; i<this.pit.length/(this.pitN+2); i++){
      var val = pit[i*(pitN+2)];
      var aro = pit[i*(pitN+2) + 1];
      
      var dist = Math.sqrt((mouseVal - val)*(mouseVal - val) + (mouseAro - aro)*(mouseAro - aro));
      
      gl.strokeStyle = "rgba(255,255,255,0.4)";
  		gl.lineWidth = 2;
      // Mouse over facial expression
      if (dist < minDist && !this._candidate) {
      	gl.fillStyle = "rgba(0,255,0,0.8)";
        this._selExpr = i;
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
    var lsKeys = Object.keys(this.LS);
    
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
    
    var hSq = Math.min(30, h*0.7/mt.length);
    var startWminus = 300;
    
    for (var i = 0; i<mt.length; i++){
      rect={x:w-startWminus,y:0.07*h + i*hSq*1.25,w:150,h:hSq*0.75};
      
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
    }
    // Reset button
    rect={x:w-startWminus,y:0.07*h + mt.length*hSq*1.25,w:150,h:hSq*0.75};
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
