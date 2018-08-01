class Tank {
    constructor(a, p, game){        
        
        this.game = game;

        // Tank parameters
        this.planet = p;
        this.invMass = 0;        
        this.tankSize = width*0.025;
        this.barrelLength = this.tankSize/1.15;
        this.barrelWidth = this.barrelLength/4;      
        this.hitBoxRadius = this.tankSize*0.7;
        this.shotPower = 0;
        this.maxShotPower = 10;
        this.maxHp = 100;
        this.hp = this.maxHp;
        
        // State variables
        this.pos = createVector();
        this.vel = createVector();
        this.barrelPos = createVector();
        this.rad = this.hitBoxRadius;
        this.relativeAngle = random(0, 360);
        this.relativeVel = 1;
        this.barrelAngle = 45;
        this.barrelVel = 1;
        this.absoluteAngle = 0;

        // Statuses
        this.exploded = 0;

        // Objects
        this.parentPlayer;
        this.projectiles = [];
        this.ruins = [];

        // Projectile parameters
        this.projectileType = 3;
        this.projectileDamage = 20;
        this.projectileExplosionRadius = this.tankSize;
        this.projectileLife = 5;
        this.projectileRadius = this.tankSize*0.15;
        this.projectileMass = 8;  
        
        // Trajectory
        this.trajectoryLength = 15;
        this.trajectory = [];
    }

    show(){
        let tankWidth = this.tankSize;
        let tankHeight = this.tankSize/2;

        //             //           
        //            //
        //         __//_
        //      __/__.__\__     _
        //    /      2      \    |
        //    \ _____._____ /   _| tankHeight
        //           1
        //      |_________|
        //       tankWidth

        push();

        // Draw tank
        translate(this.planet.pos); // center of planet 
        rotate(this.relativeAngle); // rotate so that X axis is parallel with tankAngle
        translate(this.planet.rad, 0); // translate to the edge of planet where the tank sits (point 1)
        translate(tankHeight, 0); // translate to point 2
        rotate(this.barrelAngle); // rotate so the barrel is parallel with X axis

        fill(this.parentPlayer.color);                
        strokeWeight(this.barrelWidth);       
        line(0, 0, this.barrelLength, 0); // draw barrel
        
        rectMode(CENTER);
        rect(this.barrelLength, 0, this.barrelWidth/3, this.barrelWidth/3);  // draw the tip of the barrel 
        
        // Draw power bar        
        let powerBarLength = map(this.shotPower, 0.1, this.maxShotPower, tankHeight*0.4, this.barrelLength + this.barrelWidth/3)
        if (powerBarLength < 0) powerBarLength = 0;        
        stroke(this.parentPlayer.color);
        line(0, 0, powerBarLength, 0); // draw barrel

        let tipOfBarrelLength = powerBarLength - (this.barrelLength - this.barrelWidth/3);
        if (tipOfBarrelLength < 0) tipOfBarrelLength = 0;
        rectMode(CORNER);   
        rect(-this.barrelWidth/3, -this.barrelWidth/3, tipOfBarrelLength, this.barrelWidth/3);

        stroke("black");
        strokeWeight(this.tankSize/10);
        rotate(-this.barrelAngle); // rotate back to tank Angle
        ellipse(0, 0, tankHeight, tankWidth* 2/3); // draw cokpit

        translate(-tankHeight, 0); // translate back to point 1
        rectMode(CORNER);
        ellipse(tankHeight/2, tankWidth/2, tankHeight); // draw rounded ends of the body
        ellipse(tankHeight/2, -tankWidth/2, tankHeight); 
        rect(0, -tankWidth/2, tankHeight, tankWidth); // draw body of the tank
        noStroke();
        ellipse(tankHeight/2, tankWidth/2, tankHeight - this.tankSize/12, tankHeight/2); // for fixing odd look
        ellipse(tankHeight/2, -tankWidth/2, tankHeight -this.tankSize/12, tankHeight/2);

        // Draw power bar
        let healthBarLength = map(this.hp, 0, this.maxHp, 0, this.tankSize * 1.2)       
        fill(this.parentPlayer.color);
        rect(-tankHeight * 0.8, -tankWidth * 0.6, tankHeight * 0.5, healthBarLength);
        pop();     
        
        // Draw trajectory
        if (keyIsDown(this.parentPlayer.SHOOT)){            
            this.showTrajectory()
        }        
    }

    control(){

        // Movement
        if (keyIsDown(this.parentPlayer.LEFT)) this.relativeAngle += this.relativeVel;
        if (keyIsDown(this.parentPlayer.RIGHT)) this.relativeAngle -= this.relativeVel;
        if (keyIsDown(this.parentPlayer.CW)) this.barrelAngle += this.barrelVel;
        if (keyIsDown(this.parentPlayer.CCW)) this.barrelAngle -= this.barrelVel;

        if(abs(this.barrelAngle) > 90) this.barrelAngle = sign(this.barrelAngle)*90;

        // Update absolute position
        this.updatePositions();

        // Shot
        if (keyIsDown(this.parentPlayer.SHOOT)){
            this.shotPower += .05;
            if (this.shotPower > this.maxShotPower) this.shotPower = this.maxShotPower;
        }else if (this.shotPower > 0){
            this.shoot();
            this.shotPower = 0;
        }
    }

    updatePositions(){
        this.absoluteAngle = this.relativeAngle + this.barrelAngle; 

        let relativeTankVector = p5.Vector.fromAngle(radians(this.relativeAngle), this.planet.rad);
        this.pos = p5.Vector.add(this.planet.pos, relativeTankVector); 

        let relativeMiddleVector = p5.Vector.fromAngle(radians(this.relativeAngle), this.tankSize/2);
        let relativeBarrelVector = p5.Vector.fromAngle(radians(this.absoluteAngle), this.barrelLength);        
        this.barrelPos = p5.Vector.add(p5.Vector.add(this.pos, relativeMiddleVector), relativeBarrelVector);
    }

    shoot(power = this.shotPower, type = this.projectileType){        
        let shot = p5.Vector.fromAngle(radians(this.absoluteAngle), power);
        switch (type) {
            case 1:
                this.projectiles.push(new Projectile(this.barrelPos, shot, this));
                break;
            case 2:
                this.projectiles.push(new ShatterProjectile(this.barrelPos, shot, this));
                break;
            case 3:
                this.projectiles.push(new TripleProjectile(this.barrelPos, shot, this));
                break;
            
            default:
                break;
        }
    }

    updateProjectiles(other){
        for(let q = this.projectiles.length - 1; q >= 0; q--){       
            for(let j = q; j >= 0; j--){
                if (this.projectiles[q] != this.projectiles[j]){
                    this.projectiles[q].resolveCollision(this.projectiles[j]);
                }
            }
            for(let k of this.game.planets){
                this.projectiles[q].resolveCollision(k);
                this.projectiles[q].gravityForce(k);
            } 
            for(let l of other.projectiles){
                if (this != other){
                    this.projectiles[q].resolveCollision(l);
                }
            }  
            for(let t of this.game.tanks){
                this.projectiles[q].resolveHit(t);
                if (this != t) {
                    this.projectiles[q].resolveCollision(t);
                }
            }  

            this.projectiles[q].wrap();            
            this.projectiles[q].airResistance();
            this.projectiles[q].move();               
            if(this.projectiles[q].life <= 0){
                this.projectiles[q].explode();
                this.projectiles.splice(q,1);
            } 
        }
    }

    showProjectiles(){
        for(let q = this.projectiles.length - 1; q >= 0; q--){
            this.projectiles[q].show(); 
        }
    }

    updateRuins(other){
        for(let q = this.ruins.length - 1; q >= 0; q--){       
            for(let j = q; j >= 0; j--){
                if (this.ruins[q] != this.ruins[j]){
                    this.ruins[q].resolveCollision(this.ruins[j]);
                }
            }
            for(let k of this.game.planets){
                this.ruins[q].resolveCollision(k);
                this.ruins[q].gravityForce(k);
            } 
            for(let l of other.projectiles){
                if (this != other){
                    this.ruins[q].resolveCollision(l);
                }
            }  
            for(let t of this.game.tanks){
                if (this != t) {
                    this.ruins[q].resolveCollision(t);
                }
            } 

            this.ruins[q].wrap();            
            this.ruins[q].airResistance();
            this.ruins[q].move();  
        }
    }

    showRuins(){
        for(let q = this.ruins.length - 1; q >= 0; q--){ 
            this.ruins[q].show();
        }
    }

    setPlayer(player){
        this.parentPlayer = player;
    }

    explode(){
        if (!this.exploded){
            for (let o = 0; o < 20; o++){
                let X = random(-10,10);
                let Y = random(-10,10);
                let vel = createVector(X*0.6,Y*0.6);
                let pos = createVector(this.pos.x + X, this.pos.y + Y);
                this.ruins.push(new Ruin(pos, vel, this));
            }
            this.game.explosions.push(new Explosion(this.pos, 2, this.tankSize*100, 0, this.game));
            this.exploded = 1;
            console.log("Tank exploded");
        }
    }

    showTrajectory(){
        this.trajectory.splice(0, this.trajectory.length);        
        let shot = p5.Vector.fromAngle(radians(this.absoluteAngle), this.shotPower);
        let particle = new Projectile(this.barrelPos, shot, this);
        let showEvery = 8;

        for(let i = 0; i < showEvery*this.trajectoryLength; i++ ){

            for(let k of this.game.planets){
                particle.resolveCollision(k);
                particle.gravityForce(k);
            }            
            
            particle.wrap();           
            particle.airResistance();
            particle.move();

            if (i % showEvery == 0){
                this.trajectory.push(particle.pos.copy());
            }
        }
        for(let t of this.trajectory){
            push();
            fill(particle.color);
            stroke(0);
            ellipse(t.x, t.y, particle.rad * 0.5);
            pop()
        }
    }

}