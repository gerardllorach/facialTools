//@threeLS
// Visemes: jaw, kiss, lipsClosed
// --------------------- THREELIPSYNC MODULE --------------------

// Switch to https if using this script
if (window.location.protocol != "https:")
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);


// Globals
if (!LS.Globals)
  LS.Globals = {};

// Audio context
if (!LS.Globals.AContext)
  LS.Globals.AContext = new AudioContext();


// Audio sources
// Microphone
navigator.getUserMedia  = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;


ThreeLS.prototype.refFBins = [0, 500, 700,3000, 6000];
ThreeLS.prototype.BSW = {kiss:0, lipsClosed: 0, jaw: 0};

// Constructor
function ThreeLS(threshold, smoothness, pitch) {

  // Freq analysis bins, energy and lipsync vectors
  this.energy = [0,0,0,0,0,0,0,0];
  

  // Lipsync parameters
  this.threshold = threshold || 0.0;
  this.dynamics = 30;
  this.maxDB = -30;
  
  this.smoothness = smoothness || 0.6;
  this.pitch = pitch || 1;
  // Change freq bins according to pitch
  this.fBins = [];
  this.defineFBins(this.pitch);

  // Initialize buffers
  this.init();

  this.working = false;
}





// Start mic input
ThreeLS.prototype.start = function(URL){
  // Restart
  this.stopSample();
  
  thatLip = this;
  if (URL === undefined){
    navigator.getUserMedia({audio: true}, function(stream) {
      thatLip.stream = stream;
      thatLip.sample = thatLip.context.createMediaStreamSource(stream);
      thatLip.sample.connect(thatLip.analyser);
      console.log("Mic sampling rate:", thatLip.context.sampleRate);
      thatLip.analyser.disconnect();
      thatLip.gainNode.disconnect();
      thatLip.working = true;
    }, function(e){console.error("ERROR: get user media: ", e);});
	
  }
  else
    this.loadSample(URL);
  
}



ThreeLS.prototype.loadSample = function(inURL){
  var URL = LS.RM.getFullURL (inURL);
  var request = new XMLHttpRequest();
	request.open('GET', URL, true);
	request.responseType = 'arraybuffer';
  
  var that = this;
	request.onload = function(){
		that.context.decodeAudioData(request.response,
			function(buffer){
        that.stopSample();
        that.sample = LS.Globals.AContext.createBufferSource();
				that.sample.buffer = buffer;
				console.log("Audio loaded");
        that.playSample();
			}, function(e){ console.log("Failed to load audio");});
	};
	
	request.send();
}


ThreeLS.prototype.playSample = function(){

  // Sample to analyzer
  this.sample.connect (this.analyser);
  // Analyzer to Gain
  this.analyser.connect(this.gainNode);
  // Gain to Hardware
  this.gainNode.connect(this.context.destination);
  // Volume
  this.gainNode.gain.value = 1;
  console.log("Sample rate: ", this.context.sampleRate);
  that = this;
  this.working = true;
  this.sample.onended = function(){that.working = false; console.log(that.outstr)};
  // start
  this.sample.start(0);
  //this.sample.loop = true;
  
}







// Update lipsync weights
ThreeLS.prototype.update = function(){
  
  if (!this.working)
    return;

  // FFT data
  if (!this.analyser){
    //if (this.gainNode){
      // Analyser
      this.analyser = this.context.createAnalyser();
      // FFT size
      this.analyser.fftSize = 1024;
      // FFT smoothing
      this.analyser.smoothingTimeConstant = this.smoothness;
      
    //}
    //else return;
  }
  
  // Short-term power spectrum
  this.analyser.getFloatFrequencyData(this.data);

  // Analyze energies
  this.binAnalysis();
  // Calculate lipsync blenshape weights
  this.lipAnalysis();

}



ThreeLS.prototype.stop = function(dt){
  // Immediate stop
  if (dt === undefined){
    // Stop mic input
    this.stopSample();

    this.working = false;
  }
  // Delayed stop
  else {
    thatLip = this;
    setTimeout(thatLip.stop.bind(thatLip), dt*1000);
  }
}







// Define fBins
ThreeLS.prototype.defineFBins = function(pitch){
  for (var i = 0; i<this.refFBins.length; i++)
      this.fBins[i] = this.refFBins[i] * pitch;
}


// Audio buffers and analysers
ThreeLS.prototype.init = function(){

  var context = this.context = LS.Globals.AContext;;
  // Sound source
  this.sample = context.createBufferSource();
  // Gain Node
  this.gainNode = context.createGain();
  // Analyser
  this.analyser = context.createAnalyser();
  // FFT size
  this.analyser.fftSize = 1024;
  // FFT smoothing
  this.analyser.smoothingTimeConstant = this.smoothness;
  
  // FFT buffer
  this.data = new Float32Array(this.analyser.frequencyBinCount);

}


// Analyze energies
ThreeLS.prototype.binAnalysis = function(){
  
  // Signal properties
  var nfft = this.analyser.frequencyBinCount;
  var fs = this.context.sampleRate;

  var fBins = this.fBins;
  var energy = this.energy;

  
  // Energy of bins
  for (var binInd = 0; binInd < fBins.length-1; binInd++){
    // Start and end of bin
    var indxIn = Math.round(fBins[binInd]*nfft/(fs/2));
    var indxEnd = Math.round(fBins[binInd+1]*nfft/(fs/2));

    // Sum of freq values
    energy[binInd] = 0;
    for (var i = indxIn; i<indxEnd; i++){
			// Power Spectogram
      //var value = Math.pow(10, this.data[i]/10);
      // Previous approach
      var value = 0.5+(this.data[i]+20)/140;
      if (value < 0) value = 0;
      energy[binInd] += value;
    }
    // Divide by number of sumples
    energy[binInd] /= (indxEnd-indxIn);

  }
}

// Calculate lipsyncBSW
ThreeLS.prototype.lipAnalysis = function(){
  
  var energy = this.energy;

  if (energy !== undefined){
    
    
    var value = 0;
    

    // Kiss blend shape
    // When there is energy in the 1 and 2 bin, blend shape is 0
    value = (0.5 - (energy[2]))*2;
    if (energy[1]<0.2)
      value = value*(energy[1]*5)
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.BSW.kiss = value;

    // Lips closed blend shape
    value = energy[3]*3;
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.BSW.lipsClosed = value;
    
    // Jaw blend shape
    value = energy[1]*0.8 - energy[3]*0.8;
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.BSW.jaw = value;
    
  }

}




// Stops mic input
ThreeLS.prototype.stopSample = function(){
  // If AudioBufferSourceNode has started
  if(this.sample)
    if(this.sample.buffer)
      this.sample.stop(0);

  
  // If microphone input
  if (this.stream){
    var tracks = this.stream.getTracks();
    for (var i = 0; i<tracks.length; i++)
      if (tracks[i].kind = "audio")
        tracks[i].stop();
    this.stream = null;
	}

}