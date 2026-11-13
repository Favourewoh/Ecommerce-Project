let students = ["Favour", "Divine", "Wisdom", "Glory"]

let linearSteps = 0
let pairSteps = 0

for(let i = 0; i < students.length; i++) {
    linearSteps++
};

for(let i = 0; i < students.length; i++){
    for(let j = 0; j < students.length; j++) {
        pairSteps++
    }
};

console.log(linearSteps, pairSteps);
kl