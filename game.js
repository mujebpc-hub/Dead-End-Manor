function startGame(){
document.getElementById("menu").style.display="none";
document.getElementById("loading").style.display="block";

let progress=0;

let interval=setInterval(()=>{
progress+=2;
document.getElementById("progress").style.width=progress+"%";

if(progress>=100){
clearInterval(interval);

setTimeout(()=>{
document.getElementById("loading").style.display="none";
document.getElementById("mainMenu").style.display="block";
},500);

}
},50);
}


function newGame(){

document.getElementById("mainMenu").innerHTML=`
<h1>DAY 1</h1>
<p>You wake up near Dead-End Manor...</p>
<br>
<button onclick="startScene()">START</button>
`;
}


function startScene(){

document.getElementById("game").style.display="flex";

document.getElementById("game").innerHTML=`
<h1>FIRST SCENE</h1>
<p>You are standing outside Dead-End Manor</p>
<br>
<button onclick="enterManor()">ENTER MANOR</button>
`;
}


function enterManor(){

document.getElementById("game").innerHTML=`
<h1>INSIDE MANOR</h1>
<p>Dark room... something is watching you...</p>
<br>
<button onclick="startRoom()">ENTER 3D ROOM</button>
`;
}


function startRoom(){

document.getElementById("game").innerHTML=`
<h1>3D ROOM (BASIC)</h1>
<p>Game Engine Coming Soon (Three.js / FPS system)</p>
<br>
<button onclick="alert('Next update: Granny-style AI enemy!')">
CONTINUE
</button>
`;
}
