/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2025 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "adc.h"
#include "dma.h"
#include "i2c.h"
#include "tim.h"
#include "usart.h"
#include "gpio.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */

#include "bsp.h"

/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/

/* USER CODE BEGIN PV */

/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
/* USER CODE BEGIN PFP */

/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */
#include "mcu_dmp.h"
#include "WP_DataType.h"

Sensor WP_Sensor;

int16_t raw_temp;
int16_t raw_accel[3];
float accel[3];
int16_t raw_gyro[3];
float gyro[3];

Vector3f gyro_dps;
Vector3f gyro_raw;
Vector3f accel_g;
Vector3f accel_raw;

void usart_send(float roll, float pitch, float yaw, uint8_t fusion_sta)
{
    uint8_t buffer[15];  // 数据帧缓冲区
    uint8_t sumcheck = 0; // 校验和变量
    uint8_t addcheck = 0; // 附加校验变量
    uint8_t index = 0;    // 缓冲区索引

    // 将欧拉角转换为 int16，并放大100倍
    int16_t roll_int = (int16_t)(roll * 100.0f);
    int16_t pitch_int = (int16_t)(pitch * 100.0f);
    int16_t yaw_int = (int16_t)(yaw * 100.0f);

    // 帧头 (0xAB)
    buffer[index++] = 0xAB;
    // 源地址 (假设为 0xDC, 匿名飞控的默认地址)
    buffer[index++] = 0xDC;
    // 目标地址 (0xFE, 上位机地址)
    buffer[index++] = 0xFE;
    // 功能码 (ID: 0x03 表示飞控姿态：欧拉角格式)
    buffer[index++] = 0x03;
    // 数据长度 (7字节数据)
    buffer[index++] = 7;
    buffer[index++] = 0;  // 数据长度高字节为0

    // 欧拉角数据 (int16, 角度扩大100倍)
    buffer[index++] = (uint8_t)(roll_int & 0xFF);
    buffer[index++] = (uint8_t)((roll_int >> 8) & 0xFF);
    buffer[index++] = (uint8_t)(pitch_int & 0xFF);
    buffer[index++] = (uint8_t)((pitch_int >> 8) & 0xFF);
    buffer[index++] = (uint8_t)(yaw_int & 0xFF);
    buffer[index++] = (uint8_t)((yaw_int >> 8) & 0xFF);

    // 融合状态 (uint8)
    buffer[index++] = fusion_sta;

    // 计算校验和和附加校验 (从帧头开始到DATA区结束)
    for (int i = 0; i < index; i++)
    {
        sumcheck += buffer[i];
        addcheck += sumcheck;
    }

    // 添加校验和和附加校验值
    buffer[index++] = sumcheck;
    buffer[index++] = addcheck;

    // 发送数据帧
    for (int i = 0; i < index; i++)
    {
        my_printf(&huart1,"%c", buffer[i]);
    }
}

#define MPU6050_GYRO_SCALE (1.0f / 16.4f)

void imu_proc()
{
	usart_send(WP_Sensor.rpy_fusion[0],WP_Sensor.rpy_fusion[1],WP_Sensor.rpy_fusion[2],0);
//	my_printf(&huart1,"%.2f %.2f %.2f\r\n",WP_Sensor.rpy_fusion[0],WP_Sensor.rpy_fusion[1],WP_Sensor.rpy_fusion[2]);
}

/* USER CODE END 0 */
uint32_t sys_tick = 0;
uint32_t last_tick = 0;
float dt = 0.01f;

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_USART1_UART_Init();
  MX_USART2_UART_Init();
  MX_ADC1_Init();
  MX_I2C1_Init();
  MX_I2C2_Init();
  MX_I2C3_Init();
  MX_USART3_UART_Init();
  /* USER CODE BEGIN 2 */
  
		
	MPU_Init();
	mpu_dmp_init();
	
		
	scheduler_init();

  /* USER CODE END 2 */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
	scheduler_run();
	/* 读取加速度 */
	sys_tick = uwTick;
	dt = (sys_tick - last_tick) / 1000.0f;
	last_tick = sys_tick;
	MPU_Get_Gyroscope(&raw_gyro[0], &raw_gyro[1], &raw_gyro[2]);
	MPU_Get_Accelerometer(&raw_accel[0], &raw_accel[1], &raw_accel[2]); 	//加速度 

 
	
    
    gyro_dps.x=raw_gyro[0]*MPU6050_GYRO_SCALE;
    gyro_dps.y=raw_gyro[1]*MPU6050_GYRO_SCALE;
    gyro_dps.z=raw_gyro[2]*MPU6050_GYRO_SCALE;

    accel_g.x=raw_accel[0]/2048;
    accel_g.y=raw_accel[1]/2048;
    accel_g.z=raw_accel[2]/2048;

    // 使用新的IMU算法更新姿态
    Axis3f acc = {accel_g.x, accel_g.y, accel_g.z};
    Axis3f gyro = {gyro_dps.x, gyro_dps.y, gyro_dps.z};

    imu_update(acc, gyro, dt);

    // 获取欧拉角
    EulerAngles angles = imu_get_euler_angles(gyro);

    WP_Sensor.rpy_fusion[0] = angles.roll;
    WP_Sensor.rpy_fusion[1] = angles.pitch;
    WP_Sensor.rpy_fusion[2] = angles.yaw;

	
	
  }
  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Configure the main internal regulator output voltage
  */
  __HAL_RCC_PWR_CLK_ENABLE();
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSE;
  RCC_OscInitStruct.HSEState = RCC_HSE_ON;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;
  RCC_OscInitStruct.PLL.PLLM = 4;
  RCC_OscInitStruct.PLL.PLLN = 168;
  RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV2;
  RCC_OscInitStruct.PLL.PLLQ = 4;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV4;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV2;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_5) != HAL_OK)
  {
    Error_Handler();
  }
}

/* USER CODE BEGIN 4 */

/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}

#ifdef  USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
