#include <stdio.h>
#include <stdlib.h>
#include <unistd.h> // Para el sleep

#define True 1
int main(int argc, char** argv){

    do{

        system("python3 /home/kevinc-debian/Python/bot2.py");
        printf("\nTerminó\n");
        printf("\nlevantando de nuevo en 3 segundos el bot\n");
        sleep(3);

    } while (True);

    return 0;
}
