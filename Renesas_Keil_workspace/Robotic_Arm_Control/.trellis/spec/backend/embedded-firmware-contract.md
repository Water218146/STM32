# Embedded Firmware Contract

This document records project-specific firmware constraints for `Robotic_Arm_Control`. It is intentionally written in Chinese because the project owner requires Simplified Chinese communication for this embedded firmware work.

## Project Identity

- `Robotic_Arm_Control` is the RA6M5 robotic arm control board firmware.
- The MCU is Renesas RA6M5, target device `R7FA6M5BF3CFP`.
- The board is a ModbusRTU slave over RS485, not a bus master.
- The fixed slave address is `1`.
- The board controls PCA9685 over I2C, and PCA9685 generates servo PWM.
- Local UART interfaces:
  - TJC/HMI UART for local slider/joystick control, action recording, and playback.
  - Debug UART for diagnostic output.

## HMI Display Contract

- The TJC/HMI display is a 3.2-inch serial screen.
- Display resolution is `320x240`.
- The screen has a GB2312 font library available.
- User-visible HMI text should be Simplified Chinese.
- HMI layout must be designed for `320x240`; do not assume larger layouts such as `800x480`.
- Component internal names may use short ASCII names such as `h0`, `n0`, and `b0`, but visible labels should be Chinese.

### HMI Page Contract v0.1

- HMI pages are `首页`, `手动`, `关节`, and `动作`.
- The bottom navigation labels must stay in fixed positions across pages: `[首页] [手动] [关节] [动作]`.
- The home page device title is `机械臂控制终端`; do not label it as `主控`.
- The home page is a status overview page and must not directly control the robotic arm.
- The home page displays robotic arm state and vision-board connection state using Chinese labels such as `状态:就绪` and `视觉端:在线`, plus current action id, action step count, error code, and position summary.
- The manual page provides real-time sliders for `前后X`, `左右Y`, `上下Z`, `腕俯仰`, `腕旋转`, and `夹爪`.
- The manual page must not require an `执行` confirmation button for normal manual operation; slider changes represent real-time manual control intents.
- Firmware must clamp, rate-limit, and smooth HMI manual-control inputs before driving servos.
- The joint page is for single-joint calibration, maintenance, and reset-pose setup.
- The joint page must provide `复位` and `设为复位`; reset pose is a saved six-joint target pose and is not equivalent to all servos at `1500us`.
- The action page records full-arm pose keyframes, not separate per-joint action tracks.
- Each recorded step must represent the full current arm pose: six joint targets, gripper state, and step duration.
- Action playback must automatically return to the saved reset pose and then set status back to ready.
- Do not place `急停` on the home page until a complete emergency-stop behavior is implemented.

### HMI And Vision Board Data Flow

- The vision board must not control the HMI first and rely on the HMI to control the robotic arm.
- The supported control path is: `vision board -> RS485/ModbusRTU -> RA6M5 arm_control -> PCA9685/servos`.
- RA6M5 may synchronize status and current values back to the HMI for display.
- Vision-board commands such as action playback, target pose, or mode switching must enter `arm_control` before affecting servos.

## Cross-Project Boundary

- The vision board project is at `D:\AAAWaterCode\Rtthread_workspace\vision_board_basic`.
- The vision board is the RS485 bus master.
- The vision board polls and commands RS485 slaves.
- The vision board must not be treated as the low-level robotic arm PWM controller.
- Do not modify the vision board project unless the user explicitly asks for it.
- If protocol planning needs adjustment, propose the change and impact first. Do not directly change both sides of the protocol.

## RS485 Bus Contract

- Protocol: ModbusRTU.
- Baud rate: `57600`.
- UART format: `8N1`.
- CRC: Modbus CRC16.
- Vision board: master.
- Robotic arm control board: slave address `1`.
- ZDT motor: slave address `2`.
- Reserved PC/debug slave address: `0x10`.
- Broadcast address `0` is not a first-stage dependency.
- The robotic arm control board must not actively occupy the bus to send unsolicited data.
- Slave-side RS485 communication is passive response only.
- Do not allow multiple tasks to directly send RS485 data.

## Vision Board Stable Baseline

- TX: `P801`.
- RX: `P009 / IRQ13-DS`.
- DE: `P007`.
- Default baud rate: `57600`.
- Completed 1-hour ZDT/Modbus test:
  - `rx_overflows = 0`
  - `zdt errors = 0`
  - Modbus read/write, ZDT speed/stop/read all passed.
- `Robotic_Arm_Control` must not require the vision board to return to `115200`.

## Required Modbus Function Codes

- Must support `0x03`: Read Holding Registers.
- Must support `0x06`: Write Single Register.
- Must support `0x10`: Write Multiple Registers.
- First stage does not require `0x04`, `0x05`, or `0x0F`.
- Illegal function codes and illegal addresses must return Modbus exceptions.
- CRC-invalid frames must be dropped silently without response.

## Holding Register Map

| Address | Name | Rule |
|---:|---|---|
| `0x0000` | `device_id` | fixed recommended value `0xA601` |
| `0x0001` | `firmware_version` | firmware version |
| `0x0002` | `status_flags` | bit field below |
| `0x0003` | `error_code` | current error code |
| `0x0004` | `control_mode` | enum below |
| `0x0005` | `command` | enum below |
| `0x0006` | `command_seq` | command idempotency sequence |
| `0x0010` | `servo_enable_mask` | servo enable bit mask |
| `0x0020-0x002F` | `servo_current_us` | current pulse width in us |
| `0x0030-0x003F` | `servo_target_us` | target pulse width in us |
| `0x0040-0x004F` | `servo_min_us` | min pulse width in us |
| `0x0050-0x005F` | `servo_max_us` | max pulse width in us |
| `0x0060` | `move_duration_ms` | move duration in ms |
| `0x0061` | `action_slot_index` | action slot index |
| `0x0062` | `action_record_length` | action record length |
| `0x0070` | `comm_watchdog_ms` | communication watchdog in ms |

## Status Flags

| Bit | Name |
|---:|---|
| 0 | `ready` |
| 1 | `enabled` |
| 2 | `moving` |
| 3 | `homed` |
| 4 | `local_hmi_active` |
| 5 | `remote_modbus_active` |
| 6 | `error` |
| 7 | `emergency_stop` |

## Control Mode

| Value | Name |
|---:|---|
| 0 | `idle` |
| 1 | `remote_modbus` |
| 2 | `local_hmi` |
| 3 | `playback` |

## Command

| Value | Name |
|---:|---|
| 0 | `none` |
| 1 | `enable` |
| 2 | `disable` |
| 3 | `home` |
| 4 | `stop` |
| 5 | `move_to_targets` |
| 6 | `record_start` |
| 7 | `record_stop` |
| 8 | `playback_start` |
| 9 | `playback_stop` |

## Command Sequencing

- The vision board must increment `command_seq` every time it writes `command`.
- `Robotic_Arm_Control` must execute `command` only once when `command_seq` changes.
- This prevents master retries or repeated writes from executing the same command multiple times.

## Servo Rules

- Pulse width unit is always microseconds.
- Default safe midpoint should be `1500us`.
- Default safe clamp range should be `500-2500us`.
- Writes to `servo_target_us` must be clamped.
- PCA9685 output must not bypass the `servo_target_us` / `servo_current_us` register model.

## Servo Joint Calibration Contract

- PCA9685 channels `0-5` are the active robotic arm servo channels for the first hardware revision.
- Joint numbering follows the mechanical order from bottom to top.
- Direction and limit values must be based on real hardware calibration, not guessed from servo model defaults.
- Do not convert HMI or Modbus commands to joint angle semantics until the corresponding channel direction and safe limits are recorded.

### Robot Base Coordinate Frame v0.2

- Use a right-handed base coordinate frame.
- Origin: J1/Base rotation center.
- `+Z_base`: vertical upward from the base.
- `+X_base`: horizontal forward direction of the end effector in the neutral/middle arm pose.
- `+Y_base`: defined by the right-handed rule, satisfying `X_base x Y_base = Z_base`; equivalently `Y_base = Z_base x X_base`.
- Do not document directions with ambiguous wording such as "facing +X" unless the observation direction is explicit, for example "looking from the origin toward +X_base" or "looking from the +X_base side back toward the origin".
- Joint angle signs must be defined by the robot coordinate frames and each joint axis, not by whether PWM pulse width increases or decreases.
- Tool frame: `+X_tool` points from the gripper toward the object; J5/Roll rotates around `+X_tool`; `+Y_tool` rotating toward `+Z_tool` is positive Roll by the right-hand rule.

| Joint | Name | PCA9685 Channel | Calibration Points | Increasing Pulse Width | Decreasing Pulse Width | Safe/Debug Limits |
|---|---|---:|---|---|---|---|
| J1 | Base / 腰关节 | 0 | `500us=-90deg`, `1500us=0deg`, `2500us=+90deg` | Counterclockwise when viewed from above the base; angle increases / 从上方俯视底座为逆时针，角度增大 | Clockwise when viewed from above the base; angle decreases / 从上方俯视底座为顺时针，角度减小 | `500-2500us` |
| J2 | Shldr / 肩关节 | 1 | `2327us≈0deg` horizontal toward `+X_base`, `1312us≈+90deg` vertical toward `+Z_base`, `500us` reset candidate | Upper arm moves down; angle decreases / 大臂下放，角度减小 | Upper arm moves up/retracts; angle increases / 大臂上抬或回收，角度增大 | Mechanical `500-2327us`; HMI may conservatively cap at `2300us` |
| J3 | Elbow / 肘关节 | 2 | Forearm relative to upper arm: `500us≈-90deg`, `1500us=0deg`, `2356us≈+90deg` | Forearm rotates toward `-X_base`; angle increases / 小臂向 `-X_base` 侧转，角度增大 | Forearm rotates toward `+X_base`; angle decreases / 小臂向 `+X_base` 侧转，角度减小 | `500-2356us` |
| J4 | Pitch / 腕俯仰 | 3 | Hand/gripper relative to forearm: `1500us=0deg`, `2443us≈-90deg` | Wrist pitches forward/down; angle becomes negative / 手腕向前下俯，角度变负 | Wrist pitches up; angle increases / 手腕上仰，角度增大 | Work limit `1500-2443us`; mechanically tested near `2500us` |
| J5 | Roll / 腕旋转 | 4 | Around `+X_tool`: `500us≈-90deg`, `1457us=0deg`, `2415us≈+90deg` | `+Y_tool` rotates toward `+Z_tool`; Roll increases / `+Y_tool` 转向 `+Z_tool`，Roll 增大 | `+Z_tool` rotates toward `+Y_tool`; Roll decreases / `+Z_tool` 转向 `+Y_tool`，Roll 减小 | `500-2415us`; `1457us` makes the hand parallel to `XY_base` |
| J6 | Grip / 夹爪 | 5 | Position control; not currently modeled as a kinematic joint angle / 位置控制，当前不按关节角建模 | Closes / 夹爪闭合 | Opens / 夹爪张开 | `500-1500us`; `500us` max open, `1500us` nearly closed |

### HMI Joint Angle Display Formulas

- HMI currently sends only `ch + us` frames to RA6M5. HMI angle values are local debug display values and must not become a separate control protocol.
- J2/Shldr display may use the measured `2327us` zero point even if the slider max is capped at `2300us`: `angle = (2327 - us) * 90 / 1015`.
- J3/Elbow should use segmented display: `500-1500us` maps `-90deg..0deg`, and `1500-2356us` maps `0deg..+90deg`.
- J4/Pitch display: `angle = -(us - 1500) * 90 / 943`; `2443us≈-90deg`. If the slider allows `2500us`, display can reach about `-95deg`, but formal motion may clamp to `2443us`.
- J5/Roll should use segmented display: `500-1457us` maps `-90deg..0deg` with divisor `957`, and `1457-2415us` maps `0deg..+90deg` with divisor `958`.
- Future vision-board or PC grasp-angle values must be converted from camera/image coordinates into robot/tool frame target angles, such as `Roll_target_deg`, before being sent to RA6M5.

### Temporary Reset Pose v0.1

- Current HMI joint-page pre-initialization event directly sends this temporary reset pose to RA6M5 for hardware validation:
  - Base/PWM0/h0: `1500us`
  - Shldr/PWM1/h1: `500us`
  - Elbow/PWM2/h2: `500us`
  - Pitch/PWM3/h3: `2443us`
  - Roll/PWM4/h4: `1457us`
  - Grip/PWM5/h5: `500us`
- This HMI-driven reset is a temporary validation path. The formal firmware design should store and execute the reset pose inside RA6M5 `arm_control`, with HMI only displaying or updating it.

### Gripper Servo Safety

- The J6 gripper servo is position-controlled, not torque-controlled.
- Do not command a much smaller gripper opening to increase holding force against a large object.
- If the object blocks the commanded position, the servo can stall, pull down the servo supply, heat up, enter internal protection, or release after holding briefly.
- Future J6 close commands should approach the object in small pulse-width steps and stop increasing closure after contact is observed or inferred.

## Unified Control Layer Rule

- All control sources, including Modbus and local HMI, must enter one robotic arm state/command layer.
- Modbus modules, HMI modules, scheduler tasks, and future playback modules must not directly compete for PCA9685 ownership.
- PCA9685 should be driven through the unified state/command model.

## Joint Debug Acceptance Contract

- With only the vision board connected to the robotic arm control board:
  - `modbus_read 1 0x0000 4` must return `device_id`, `firmware_version`, `status_flags`, and `error_code`.
- With the vision board connected to both robotic arm control board and ZDT:
  - `modbus_read 1 0x0000 4` must work.
  - `modbus_read 2 0x003c 1` must work.
  - `zdt_read 2` must work.
- After joint debugging, vision board `modbus_stat` should satisfy:
  - `crc_errors = 0`
  - `timeouts = 0`
  - `retries = 0`
  - `parse_errors = 0`

## Required Review Gate

- Before any firmware code change, present the implementation plan, affected files, protocol impact, and verification method to the user.
- Wait for user approval before editing firmware code.
- Do not silently change register addresses, bit definitions, function code support, baud rate, or cross-project protocol contracts.
