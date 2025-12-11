// Flow Test Calculations
// This module handles all flow test calculations

// Make calculateFlowResults globally accessible
window.calculateFlowResults = function calculateFlowResults() {
  const readings = [];
  const gpmInputs = document.querySelectorAll('.flow-gpm');
  const percentChangeCells = document.querySelectorAll('.flow-percent-change');
  
  // Get flowTableBody from global scope
  const flowTableBody = window.flowTableBody || document.getElementById('flowTableBody');
  
  // Collect readings with their row elements
  const rows = flowTableBody ? flowTableBody.querySelectorAll('tr') : [];
  const readingData = [];
  
  rows.forEach((row, index) => {
    const gpmInput = row.querySelector('.flow-gpm');
    const timeInput = row.querySelector('.flow-time');
    if (gpmInput && gpmInput.value) {
      const gpm = parseFloat(gpmInput.value);
      const time = timeInput ? parseFloat(timeInput.value) : null;
      readings.push(gpm);
      readingData.push({ gpm, time, row, index });
    }
  });

  // Calculate % change for each row
  readingData.forEach((data, index) => {
    const percentChangeCell = data.row.querySelector('.flow-percent-change');
    if (percentChangeCell) {
      if (index === 0) {
        // First reading has no previous reading
        percentChangeCell.textContent = '--';
      } else {
        const previousGpm = readingData[index - 1].gpm;
        if (previousGpm && previousGpm !== 0) {
          const percentChange = ((data.gpm - previousGpm) / previousGpm) * 100;
          percentChangeCell.textContent = percentChange.toFixed(2) + '%';
          // Color code: green for positive, red for negative
          if (percentChange > 0) {
            percentChangeCell.style.color = '#2e7d32';
          } else if (percentChange < 0) {
            percentChangeCell.style.color = '#d32f2f';
          } else {
            percentChangeCell.style.color = '#666';
          }
        } else {
          percentChangeCell.textContent = '--';
        }
      }
    }
  });

  if (readings.length > 0) {
    // Peak flow
    const peak = Math.max(...readings);
    const peakEl = document.getElementById('peakFlow');
    if (peakEl) peakEl.textContent = peak.toFixed(2) + ' GPM';

    // Sustained yield (average of last 4 readings)
    const sustainedYieldEl = document.getElementById('sustainedYield');
    if (readings.length >= 4) {
      const last4 = readings.slice(-4);
      const avg = last4.reduce((a, b) => a + b, 0) / last4.length;
      if (sustainedYieldEl) sustainedYieldEl.textContent = avg.toFixed(2) + ' GPM';
    } else {
      if (sustainedYieldEl) sustainedYieldEl.textContent = '--';
    }

    // Average Flow Rate (average of all readings)
    const averageFlowRate = readings.reduce((a, b) => a + b, 0) / readings.length;
    const averageFlowRateEl = document.getElementById('averageFlowRate');
    if (averageFlowRateEl) averageFlowRateEl.textContent = averageFlowRate.toFixed(2) + ' GPM';

    // Volume Yield calculations
    // 12 hours = 720 minutes, 24 hours = 1440 minutes
    const volume12hr = averageFlowRate * 720; // gallons
    const volume24hr = averageFlowRate * 1440; // gallons
    
    const volume12hrEl = document.getElementById('volume12hr');
    if (volume12hrEl) volume12hrEl.textContent = volume12hr.toFixed(0) + ' gal';
    
    const volume24hrEl = document.getElementById('volume24hr');
    if (volume24hrEl) volume24hrEl.textContent = volume24hr.toFixed(0) + ' gal';
    
    // Calculate total water discharged during test (sum of GPM * time intervals)
    let totalWaterDischarged = 0;
    for (let i = 0; i < readingData.length; i++) {
      const current = readingData[i];
      const next = readingData[i + 1];
      if (current.time !== null && current.gpm > 0) {
        if (next && next.time !== null) {
          // Calculate gallons for this interval: GPM * minutes
          const intervalMinutes = next.time - current.time;
          totalWaterDischarged += current.gpm * intervalMinutes;
        } else if (i === readingData.length - 1) {
          // Last reading: assume 15-minute interval (or use average if we have previous intervals)
          const avgInterval = readingData.length > 1 
            ? (current.time - readingData[0].time) / (readingData.length - 1)
            : 15;
          totalWaterDischarged += current.gpm * avgInterval;
        }
      }
    }
    const totalWaterEl = document.getElementById('totalWaterDischarged');
    if (totalWaterEl) {
      totalWaterEl.textContent = totalWaterDischarged.toFixed(0) + ' gallons';
    }
    
    // % Change for final 3 readings
    const percentChangeFinal3El = document.getElementById('percentChangeFinal3');
    if (readings.length >= 3) {
      const final3 = readings.slice(-3);
      // Calculate average % change across the final 3 readings
      let totalPercentChange = 0;
      let validChanges = 0;
      
      for (let i = 1; i < final3.length; i++) {
        const prev = final3[i - 1];
        const curr = final3[i];
        if (prev && prev !== 0) {
          const change = ((curr - prev) / prev) * 100;
          totalPercentChange += change;
          validChanges++;
        }
      }
      
      if (validChanges > 0) {
        const avgPercentChange = totalPercentChange / validChanges;
        if (percentChangeFinal3El) {
          percentChangeFinal3El.textContent = avgPercentChange.toFixed(2) + '%';
          // Color code
          if (avgPercentChange > 0) {
            percentChangeFinal3El.style.color = '#2e7d32';
          } else if (avgPercentChange < 0) {
            percentChangeFinal3El.style.color = '#d32f2f';
          } else {
            percentChangeFinal3El.style.color = '#666';
          }
        }
      } else {
        if (percentChangeFinal3El) percentChangeFinal3El.textContent = '--';
      }
    } else {
      if (percentChangeFinal3El) percentChangeFinal3El.textContent = '--';
    }
  } else {
    const peakEl = document.getElementById('peakFlow');
    if (peakEl) peakEl.textContent = '--';
    const sustainedYieldEl = document.getElementById('sustainedYield');
    if (sustainedYieldEl) sustainedYieldEl.textContent = '--';
    const averageFlowRateEl = document.getElementById('averageFlowRate');
    if (averageFlowRateEl) averageFlowRateEl.textContent = '--';
    const volume12hrEl = document.getElementById('volume12hr');
    if (volume12hrEl) volume12hrEl.textContent = '--';
    const volume24hrEl = document.getElementById('volume24hr');
    if (volume24hrEl) volume24hrEl.textContent = '--';
    const percentChangeFinal3El = document.getElementById('percentChangeFinal3');
    if (percentChangeFinal3El) percentChangeFinal3El.textContent = '--';
  }
  
  // Calculate water column volume
  if (typeof window.calculateWaterColumn === 'function') {
    window.calculateWaterColumn();
  }
};

// Make calculateWaterColumn globally accessible
window.calculateWaterColumn = function calculateWaterColumn() {
  const staticWaterLevel = parseFloat(document.getElementById('staticWaterLevel')?.value || '');
  const totalDepth = parseFloat(document.getElementById('totalDepth')?.value || '');
  const pipeDiameter = parseFloat(document.getElementById('pipeDiameter')?.value || 6);
  
  const waterColumnEl = document.getElementById('waterColumnVolume');
  const detailsEl = document.getElementById('waterColumnDetails');
  
  if (!staticWaterLevel || !totalDepth || staticWaterLevel >= totalDepth) {
    if (waterColumnEl) waterColumnEl.textContent = 'Enter Well Basics';
    if (detailsEl) detailsEl.textContent = '';
    return;
  }
  
  // Calculate water column height (from static level to pump/bottom)
  const waterColumnHeight = totalDepth - staticWaterLevel; // Height in feet
  
  if (waterColumnHeight <= 0) {
    if (waterColumnEl) waterColumnEl.textContent = 'Invalid';
    if (detailsEl) detailsEl.textContent = '';
    return;
  }
  
  // Convert diameter from inches to feet
  const diameterFeet = pipeDiameter / 12;
  const radiusFeet = diameterFeet / 2;
  
  // Volume in cubic feet: π * r² * h
  const volumeCubicFeet = Math.PI * radiusFeet * radiusFeet * waterColumnHeight;
  
  // Convert to gallons: 1 cubic foot = 7.48052 gallons
  const volumeGallons = volumeCubicFeet * 7.48052;
  
  if (waterColumnEl) {
    waterColumnEl.textContent = volumeGallons.toFixed(0) + ' gal';
  }
  
  if (detailsEl) {
    detailsEl.textContent = `Height: ${waterColumnHeight.toFixed(1)} ft | Diameter: ${pipeDiameter}" | Volume: ${volumeCubicFeet.toFixed(1)} ft³`;
  }
};
