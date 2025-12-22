#ifndef __DAC_APP_H_
#define __DAC_APP_H_

#include "mydefine.h"

// Waveform generation functions
void Generate_Sine_Wave(uint16_t* buffer, uint32_t samples, uint16_t amplitude, float phase_shift);
void Generate_Triangle_Wave(uint16_t* buffer, uint32_t samples, uint16_t amplitude, float phase_shift);
void Generate_Square_Wave(uint16_t* buffer, uint32_t samples, uint16_t amplitude, float phase_shift);

// DAC initialization and task functions
void dac_wave_init(void);   // Unified DAC initialization function
void dac_task(void);        // DAC task function

// External variable declarations
extern uint8_t dac_mode;           // DAC mode (0=sine, 1=triangle, 2=square)
extern uint16_t WaveBuffer[];   // Wave buffer (optional, for debugging)

#endif
