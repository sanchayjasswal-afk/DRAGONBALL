# Nightfall: Last Stand

## Play

Open `index.html` in a browser and click **Deploy**. Move with **WASD** or the
arrow keys, aim with the mouse, fire with click or **Space**, buy ammo with
**R**, switch owned guns with **1-5**, and pause with **P**. Clear each wave to
advance; survive all 100 waves to win.

The browser game is self-contained and needs no install or build step. Zombie
types, health, and wave sizes increase as you progress. Roaming zombies spawn
across the whole map and appear on the radar. Earn cash from kills and cleared
waves, buy weapons in the field armory, or explore for weapon caches. The rifle
has 50 rounds, the shotgun has 20 shells, the energy pistol has unlimited ammo,
and the rare, expensive energy cannon fires area-blast charges.

## C++ prototype

`main.cpp` is the earlier CodeBlaster terminal prototype. Build it with a
C++17 compiler:

```text
g++ -std=c++17 -Wall -Wextra -pedantic main.cpp -o codeblaster
```
