class RandomGenerator{
    gerarRandomico(min, max){
        return parseInt(Math.random() * (max - min) + min);
    }
}
module.exports = RandomGenerator;