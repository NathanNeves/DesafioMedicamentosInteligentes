// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
const axios = require('axios'); 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion,Text} = require('dialogflow-fulfillment'); 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  function perguntarProdutos(agent){
    return axios.get('https://ahx17z9jq8.execute-api.sa-east-1.amazonaws.com/dev/listarProdutos').then(res=>{    
      let texto = 'Nós temos os seguintes produtos:\n\n';
      for(let produtos of res.data.Mensagem){
      	console.log(produtos.nome);	
        texto+=produtos.nome+' - '+'R'+produtos.preco+'\n\n';
      }
      const novoTexto = new Text(texto);
      agent.add(novoTexto);
	});
  }
	function getCep(cep){
  		return axios.get(`https://viacep.com.br/ws/${cep}/json/`);  
  }
  function deslogar(agent){
  		agent.context.set({name:'logindata',lifespan:-1});
    	 agent.context.set({name:'loginpergunta-followup',lifespan:-1}); 
    	agent.add('Você foi deslogado com sucesso');
  }
  function tratarBonecos(Bonecos){
  	let bonecosTratados = new Array();
    for(let i=0;i<Bonecos.length;i++){
    	bonecosTratados.push(`${Bonecos[i].Personagens} ${Bonecos[i].Tamanho}`);
    }
    return bonecosTratados; 
  }
  function carrinho(agent){
  	const session = agent.context.get('logindata').parameters;
    const productSession = agent.context.get('carrinho').parameters;
    const bonecos = tratarBonecos(productSession.Bonecos);
    const header = {
    	user:session.userData.email,
    	quantidade: productSession.number,
    	produto: bonecos,
    	};
 
   	return axios.post('https://ahx17z9jq8.execute-api.sa-east-1.amazonaws.com/dev/adicionarCarrinho/',header).then(res=>{
        agent.add(res.data.Mensagem);
      	agent.add(`${session.userData.nome}, se você quiser ver seu carrinho de compras, basta dizer: "Ver carrinho" ou então "Eu quero ver meu carrinho". Se você quiser terminar suas compras basta avisar também`);
    }).catch(err=>{
      	console.log(err.response);
    	agent.add(err.response.data.Mensagem);
    	agent.context.set({name:'carrinho',lifespan:-1});
    });
  }
  function convertToNumber(value){
  	 return Number(value.replace(/[^0-9\.-]+/g,""));
  }
  function verCarrinho(agent){
	const session = agent.context.get('logindata').parameters; 
  	 return axios.post('https://ahx17z9jq8.execute-api.sa-east-1.amazonaws.com/dev/verificarCarrinho',{id:session.userData.id}).then(res=>{    
      let texto = 'Você possui os seguintes itens no seu carrinho :\n\n';
      let total = 0;
      for(let itens of res.data.Mensagem){	
        texto+=itens.quantidade+' - '+itens.nome+',\n\n';
      	total+=(convertToNumber(itens.preco)*itens.quantidade);
      }
      const novoTexto = new Text(texto);
      agent.add(novoTexto);
      agent.add(`Valor total no carrinho: R$${total} `);
      agent.add(`${session.userData.nome}, quando quiser terminar a compra basta avisar`);
	});
  }
    	
  
  function logar(agent){
    const session = agent.context.get('logindata').parameters;
  	return axios.post('https://ahx17z9jq8.execute-api.sa-east-1.amazonaws.com/dev/logar',{email:session.email}).then(res=>{
    	console.log(res.data);
      if(res.status == 200){
          	const newsession = {email: session.email, Logado: true,userData:res.data.userData};
			agent.context.set({name:'logindata',lifespan:100,parameters:newsession});
        	
          	agent.add(`Seja bem vindo ${res.data.userData.nome}, você está logado`);
        }
    }).catch(err=>{
    	agent.setContext({name:'loginpergunta-followup',lifespan:-1}); 
         agent.setContext({name:'logindata',lifespan:-1});
      	if(err.response.status == 404){
          console.log(err.response.Mensagem);
          agent.add('Seu email não existe no sistema, faça um cadastro');
        }
    });
  }
  
  function destruirCadastro(agent){
  	agent.setContext({name:'session',lifespan:-1});
  	agent.add('Se você quiser tentar se cadastrar novamente basta avisar');
  }
  
  function encerrarCadastro(agent){
  	const session = agent.context.get('session').parameters;	
    console.log(session.zip);
    return axios.post('https://ahx17z9jq8.execute-api.sa-east-1.amazonaws.com/dev/cadastrarUsuario',{
            email:session.email,
            nome: session.name,
            nascimento: session.date.split('T')[0],
            telefone: session.phone,
            cep: session.zip
            }).then(res=>{
      			console.log(res.data);
            	let resposta = "";
				if(res.status == 200){
                	agent.add('Você foi cadastrado com sucesso! Agora já pode logar e fazer diversas operações,como comprar,consultar seu carrinho e suas compras ativas');
      				agent.context.set({name:'session',lifespan:-1});
                }
     			else{
                	agent.add('Notei que esse email já existe no nosso sistema. Para continuar a usar nossa plataforma basta fazer login');
                  	agent.context.set({name:'session',lifespan:-1});
                }
  			}).catch(err=>{
                	agent.add(err.response.data.Mensagem);
                  	agent.context.set({name:'session',lifespan:-1});
                });
  }
  
  function finalizarCompra(agent){
  	let session = agent.context.get('logindata').parameters.userData;
    console.log(session.id);
    console.log(session.email);
   	return axios.post('https://ahx17z9jq8.execute-api.sa-east-1.amazonaws.com/dev/finalizarCompra',{email:session.email,id:session.id,nome:session.nome}).then(res=>{
		    agent.add('Sua compra foi realizada com sucesso');
    }).catch(err=>{
      		if(err.response.status == 404){
    			agent.add(err.response.data.Mensagem);
            }else{
            	agent.add('Houve um erro na hora de comprar');
            }
          });
  
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/dialogflow-fulfillment-nodejs/tree/master/samples/actions-on-google
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('perguntarProdutos',perguntarProdutos);
  intentMap.set('Nascimento',encerrarCadastro);
  intentMap.set('Login',logar);
  intentMap.set('Deslogar',deslogar);
  intentMap.set('Compra',carrinho);
  intentMap.set('FinalizarCarrinho',finalizarCompra);
  intentMap.set('CarrinhoCompras',verCarrinho);
  intentMap.set('MudarIdeia',destruirCadastro);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
