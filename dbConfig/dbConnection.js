const {Pool,Client} = require('pg');
const format = require('pg-format');
class dbConnection {
    constructor(){
        this.pool = new Pool({
        user:'cpwtldqs',
        password: 'r4EnuwvqcUaIW5vy7zQeYuVtfIuQWrvH',
        database: 'cpwtldqs',
        host: 'raja.db.elephantsql.com',
        port: 5432
        });
    }
    async listarProdutos(){
        const client = await this.pool.connect();
        try{
            const response = await client.query('SELECT * FROM Produtos WHERE quantidade > 0');
            return response;
        }finally{
            client.release();
        }
    }
    async pesquisarProduto(productParam){
        const client = await this.pool.connect();
        try{
            const response = await client.query('SELECT * FROM Produtos WHERE quantidade >= $1 AND nome  LIKE $2',productParam);
            return response;
        }finally{
            client.release();
        }
    }
    async getProduto(productId){
        const client = await this.pool.connect();
        try{
            const response = await client.query('SELECT * FROM Produtos WHERE id = $1',productId);
            return response;
        }finally{
            client.release();
        }
    }

    async verificarCarrinho(userId){
        const client = await this.pool.connect();
        try{
            const response = await client.query('SELECT * FROM carrinho WHERE fk_usuario_id = $1',userId);
            return response;
        }finally{
            client.release();
        }
    }

    async removerCarrinho(userId){
        const client = await this.pool.connect();
        try{
            const response = await client.query('DELETE FROM carrinho WHERE fk_usuario_id = $1',userId);
            return response;
        }finally{
            client.release();
        }
    }
    async finalizarCompra(data){
        const query = format('INSERT INTO compra(fk_usuario_id,fk_produtos_id,quantidade,transacao,entregue,dataentrega) VALUES %L RETURNING id',data)
        const client = await this.pool.connect();
        try{
            const response = await client.query(query);
            return response;
        }finally{
            client.release();
        }
    }
    /**
     * @description função para verificar o Usuario atraavés do Email
     * @param {Array} userEmail 
     */
    async verificarUsuario(userEmail){
        const client = await this.pool.connect();
        try{
            const response = await client.query('SELECT * FROM usuario WHERE email = $1',userEmail);
            return response;
        }finally{
            client.release();
        }
    }
    /**
     * @description função que tem como objetivo adicionar um usuario baseado nos dados o parâmetro userdata é um array que recebe o Email,nome,data_de_Nascimento,telefone
     * @param {Array} userdata 
     */
    async adicionarUsuario(userdata){
        const query = format('INSERT INTO Usuario(email,nome,data_de_Nascimento,telefone) VALUES %L RETURNING id',userdata)
        const client = await this.pool.connect();
        try{
            const response = await client.query(query);
            return response;
        }finally{
            client.release();
        }
    }
    /**
     * @Description Função para adicionar uma linha a tabela Endereco ele recebe um array como parametro que deve ter a seguinte ordem fk_Usuario_Id,logradouro,localidade,cep
     * @param {Array} userEndereco 
     */
    async adicionarEndereco(userEndereco){
        const query = format('INSERT INTO Endereco(fk_Usuario_Id,logradouro,localidade,cep) VALUES %L',userEndereco);
        const client = await this.pool.connect();
        try{
            const response = await client.query(query);
            return response;
        }finally{
            client.release();
        }
    }

    /**
     * @description Função que pesquisa na tabela Endereco pelos valores onde o userId precisa ser um array com o Id do Usuario
     * @param {Array} userId 
     */
    async verificarEndereco(userId){
        const client = await this.pool.connect();
        try{
            const response = await client.query('SELECT * FROM Endereco WHERE fk_Usuario_Id = $1 ',userId);
            return response;
        }finally{
            client.release();
        }
    }

    /**
     * @description Função que adiciona a tabela carrinho e possui um array como parametro quantidade,fk_Usuario_Id,fk_Produtos_Id
     * @param {Array} compraData 
     */
    async adicionarCarrinho(compraData){
        const query = format('INSERT INTO Carrinho(quantidade,fk_Usuario_Id,fk_Produtos_Id) VALUES %L',compraData);
        const client = await this.pool.connect();
        try{
            const response = await client.query(query);
            return response;
        }catch(e){
            console.log(e);
        } finally{
            client.release();
        }
    }

    async updateValor(productData){
        const query = "UPDATE produtos SET quantidade =$1 WHERE id =$2";
        const client = await this.pool.connect();
        try{
            const response = await client.query(query,productData);
            return response;
        }finally{
            client.release();
        }
    }

    /**
     * @description Função que seleciona as compras ativas de um determinado usuario 
     * @param {Array} data 
     */
    async verificarCompra(data){
        const client = await this.pool.connect();
        try {
            const response = await client.query('SELECT * FROM Compra WHERE transacao != 0 AND entregue != 1 AND fk_Usuario_Id = $1 ',data);
            return response;
        }finally{
            client.release();
        }
    }
}

module.exports = dbConnection;