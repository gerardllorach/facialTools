//@LipSync JoanPere
function LipSyncJP()
{
    var that = this;
    // Lipsync audio file
    this.audio = new Audio();
    this.audio.addEventListener("canplaythrough", function(){
      console.log("Audio loaded: ", this.src, ". Duration: ", this.duration, "sec.");
      that.playSequence();
    }, false);
  
    // Lipsync values
    this.visemes = [0,0,0,0,0,0];//["smile", "mouthAir", "lipsClosed", "lipsKiss", "sad"];
  	
  	// Visemes parameters
    this.visSeq = {};
    this.visSeq.sequence = [];
    this.visSeq.duration;
    this.lastInd = 0;
  
}

LipSyncJP.prototype.playSequence = function(){
 	if (this.audio || this.visSeq){
		if (this.audio.paused){
			this.audio.play();
			this.visSeq.startTime = getTime();
			this.lastInd = 0;
		}
	}
}

LipSyncJP.prototype.update = function(){
  
 	var lastInd = this.lastInd;
  
  // Lip-Sync sequence
  if (this.audio && this.visSeq.sequence.length){ // Both files are loaded

  	var speech = this.audio;
  	var visSeq = this.visSeq;

    
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
      
      for (var i = 0; i < this.visemes.length; i++){
        seqWeight = prev[i+1]*(1-mixFactor) + next[i+1]*mixFactor;
        
        //if (seqWeight > 1 || seqWeight < 0 || isNaN(seqWeight)){
        if (isNaN(seqWeight)){
          console.log('Something is wrong!! -- Weight: ', seqWeight, ", Num: ", i , ",Time: ", tmstmp, ", VisSeqID: ", lastInd);
        	seqWeight = 0;
        }
        
        this.visemes[i] = seqWeight;
      }
      

    } else
      lastInd = 0;
  }
  
}