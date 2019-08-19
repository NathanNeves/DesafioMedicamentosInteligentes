const express = require('express');
const dbConnection = require('../dbConfig/dbConnection');
const router = express.Router();
const connection = new dbConnection();
const axios = require('axios');
const RandomGenerator = require('../res/RandomGenerator');
const mailgun = require('mailgun-js');

async function getCep(Cep){
    const response = await axios.get(`https://viacep.com.br/ws/${Cep}/json/`);
    return response.data;
}

router.get('/listarProdutos',async (req,res)=>{
    const produtos = await connection.listarProdutos();
    res.status(200).json({Mensagem:produtos.rows});
});

router.post('/verificarCarrinho', async (req,res)=>{
    //Pesquisar carrinho com o id do usuario
    const carrinho = await connection.verificarCarrinho([req.body.id]);
    let itemValor = new Array();
    for(let i = 0; i<carrinho.rows.length;i++){
        const productResponse = await connection.getProduto([carrinho.rows[i].fk_produtos_id]);
        itemValor.push({quantidade:carrinho.rows[i].quantidade,nome:productResponse.rows[0].nome,codProduto:productResponse.rows[0].codProduto,preco:productResponse.rows[0].preco});
    }
    res.status(200).json({Mensagem:itemValor});

});

router.post('/cadastrarUsuario',async (req,res)=>{
    
    const users = await connection.verificarUsuario([req.body.email])
    if(users.rows.length > 0){
        res.status(204).send();
        return;
    }
    const addressDetails = await getCep(req.body.cep);
    const userResponse = await connection.adicionarUsuario([[req.body.email,req.body.nome,req.body.nascimento,req.body.telefone]]);
    const addressResponse = await connection.adicionarEndereco([[userResponse.rows[0].id,addressDetails.logradouro,addressDetails.localidade,addressDetails.cep]]);
        if(userResponse.rowCount>0 && addressResponse.rowCount>0){
            res.status(201).json({Mensagem:"Usuário cadastrado com sucesso"});
            return;
        }
          res.status(409).json({Mensagem:"Houve algum tipo de erro no processo de cadastro, você pode se cadastrar novamente?"});
    
});

router.post('/adicionarCarrinho/',async (req,res)=>{
    const usersResponse = await connection.verificarUsuario([req.body.user]);
    if(usersResponse.rows.length == 0){
        res.status(401).json({"Mensagem":'Você não está cadastrado na nossa plataforma, gostaria de se cadastrar?'});
        return;
    }
    console.log(req.body.quantidade);
    console.log(req.body.produto);
    for(let i=0;i<req.body.produto.length;i++){
        console.log(i);
        const productResponse = await connection.pesquisarProduto([parseInt(req.body.quantidade[i]),"%"+req.body.produto[i]+"%"]);
        if(productResponse.rows.length == 0){
            res.status(404).json({"Mensagem":"Alguns dos produtos pedidos não existem ou você pediu uma quantidade maior do que nós temos em estoque"});
            return;
        }
        console.log(productResponse.rows[0]);
        const updateProduct = await connection.updateValor([parseInt(productResponse.rows[0].quantidade)-parseInt(req.body.quantidade[i]),parseInt(productResponse.rows[0].id)]);
        const cartResponse = await connection.adicionarCarrinho([[parseInt(req.body.quantidade[i]),parseInt(usersResponse.rows[0].id),parseInt(productResponse.rows[0].id)]]);
        
}
    
    res.status(200).json({"Mensagem":'Seu produto foi adicionado ao carrinho com sucesso'});
}); 

router.post('/finalizarCompra', async (req,res)=>{
        //Salvar os dados
        const cartResponse = await connection.verificarCarrinho([req.body.id]);
        if(cartResponse.rows.length == 0){
            res.status(404).json({Mensagem:"Seu carrinho está vazio"});
            return;
        }
        //deletar os dados do usuario no carrinho
        const deleteResponse = await connection.removerCarrinho([req.body.id]);
        const rand = new RandomGenerator();
         let itens = new Array();
         let mensagem = `Olá ${req.body.nome}, você comprou os seguintes itens:\n`;
         let saldo = 0;
        for(let item of cartResponse.rows){
                const productResponse = await connection.getProduto([item.fk_produtos_id]);     
                itens.push([item.fk_usuario_id,item.fk_produtos_id,item.quantidade,rand.gerarRandomico(0,2),rand.gerarRandomico(0,2),`2019-${rand.gerarRandomico(1,13)}-${rand.gerarRandomico(1,28)}`]);
                mensagem+= item.quantidade+" - "+productResponse.rows[0].nome+"\n\n";
                saldo+=Number(productResponse.rows[0].preco.replace(/[^0-9\.-]+/g,""))*cartResponse.rows[0].quantidade;
            }
        mensagem+=`\nSuas despesas são de: R$${saldo}`;
        //adicionar todos os elementos na tabela de compras
        const buyResponse = await connection.finalizarCompra(itens);
        const Domain = "sandbox92965f205e7140da8df13b2379125493.mailgun.org";
        const key = "37275376cd52294d30acd0a47fa2c3d0-898ca80e-abf2f32c";
        const mg = mailgun({apiKey:key,domain:Domain});
        data = {
            from: 'Loja Minions <nathann-s@outlook.com>',
            to: `desafio@medicamentosinteligentes.com.br,${req.body.email}`,
            subject:'Nota fiscal',
            text:mensagem
            
        }          
        mg.messages().send(data,(err,body)=>{
            if(err){
                console.log(err);
            }
            console.log(body);
            res.status(201).json({Mensagem:"Sua compra foi realizada com sucesso, um email de confirmação foi enviado"});
        });
      
    });

router.post('/logar',async (req,res)=>{
    const usersResponse = await connection.verificarUsuario([req.body.email]);
    if(usersResponse.rowCount > 0){
        res.status(200).json({Mensagem:'Você está logado, agora pode fazer compras',Logado:true,userData:usersResponse.rows[0]});
        return;
    }
    res.status(404).json({Mensagem:"Você não está cadastrado ou o Email inserido é incorreto",Logado:false});
})
router.post('/verificarCompra',async (req,res)=>{
    const users = await connection.verificarUsuario([req.body.email]);
    if(users.rowCount == 0){
        res.status(404).json({"Mensagem":"Você não está cadastrado"});
        return;
    }
    const compras = await connection.verificarCompra([users.rows[0].id]);
    res.status(200).json({"Mensagem":compras.rows});
});

router.get('/verificarCep',async (req,res)=>{
    const data = await getCep(req.body.cep);
    return data;
});


module.exports = router;
