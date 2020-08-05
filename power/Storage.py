# Import necessary libraries
from ouimeaux.environment import Environment
import websockets
import asyncio
import socket    


def on_switch(switch):
    print("Switch found!", switch.name)


def on_motion(motion):
    print("Motion found!", motion.name)


env = Environment(on_switch, on_motion)
env.start()
env.discover(seconds=3)
print("Found the following wemo devices: ", env.list_switches())
switch = env.get_switch("Storage_System")
today_kwh = switch.today_kwh
current_power = switch.current_power
today_on_time = switch.today_on_time
on_for = switch.on_for
today_standby_time = switch.today_standby_time

# Get IP
hostname = socket.gethostname()    
IPAddr = socket.gethostbyname(hostname)    
print("Your Computer Name is:" + hostname)    
print("Your Computer IP Address is:" + IPAddr)  


# Define websocket server
async def hello(websocket, path):
    while True:
        try:
            cmd = await websocket.recv()
        except websockets.ConnectionClosed:
            print(f"Terminated")
            break
        
        # Define commands
        if cmd == 'on':
            switch.on()

        if cmd == 'off':
            switch.off()

        if cmd == 'power':
            print(switch.current_power)
            await websocket.send(str(switch.current_power))

        if cmd == 'state':
            print('state: ', switch.get_state())
            await websocket.send(str(switch.get_state()))


start_server = websockets.serve(hello, IPAddr, 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
