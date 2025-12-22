#ifndef __ADC_APP_H_
#define __ADC_APP_H_

#include "mydefine.h"

// Function declarations
void adc_tim_dma_init(void);
void adc_task(void);
void dac_sin_init(void);

// Export variables for DAC amplitude control
extern volatile float current_voltage;
extern volatile uint16_t target_amplitude;
extern float baseline_voltage;

#endif
