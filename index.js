const { Client, GatewayIntentBits, MessageFlags, cleanCodeBlockContent, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, TextInputStyle } = require('discord.js');
var config = require('./config.json')

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

var bot
var main
var posted
var accepted
var rejected

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

	bot = client.channels.cache.get(config.channel.bot);
	main = client.channels.cache.get(config.channel.main);
	posted = client.channels.cache.get(config.channel.posted);
	accepted = client.channels.cache.get(config.channel.accepted);
	rejected = client.channels.cache.get(config.channel.rejected);

	//test(main);
});

client.on('interactionCreate', async interaction => { 
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'ping') {
		await interaction.reply('Что прикажете?');
	} 
	else if (commandName === 'server') {
		await interaction.reply(`Вы на сервере Точка Пиксель.\nЧеловечков на сервере: ${interaction.guild.memberCount}.`);
	} 
	else if (commandName === 'user') {
		await interaction.reply(`Вы что, забыли? Ваше имечко: ${interaction.user.tag}\nВаш номер: ${interaction.user.id}`);
	} 
	else if (commandName === 'sort') {
		await interaction.deferReply();
		await sort(main);
		await sort(accepted);
		await interaction.editReply('Посты отсортированы, Батюшка!');
	} 
	else if (commandName === 'clean') {
		await interaction.deferReply();
		await clean(main);
		await interaction.editReply('Дело сделано!');
	} 
	else if (commandName === 'stats') {
		await interaction.deferReply();
		await interaction.editReply("Вот Ваша статистика, Барин:\n" + await stats());
	}
});

client.login(config.token);

async function test(channel){

	let message = await channel.messages.fetch({ limit: 1 })
	  .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

	message.reactions.cache.forEach(reaction => {

		console.log(reaction.emoji.name);

		createReactionBar(message);
	})
}

async function fetch(channel) {
	
	let messages = [];
  
	// Create message pointer
	let message = await channel.messages.fetch({ limit: 1 })
	  .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

	messages.push(message)
  
	while (message) {
		await channel.messages.fetch({ limit: 100, before: message.id })
		.then(messagePage => {
		  messagePage.forEach(msg => messages.push(msg));
  
		  // Update our message pointer to be last message in page of messages
		  message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
		})
	}

	console.log(`Received ${messages.length} message${messages.length > 1 ? "s" : ""} in ${channel.name}!`)
	return messages
}

function ending(n, endings)
{
	if (n % 100 > 10 && n % 100 < 20)
		return endings[2];
	
	if (n % 10 === 1)
		return endings[0];
	
	if (n % 10 > 1 && n % 10 < 5)
		return endings[1];
	
	return endings[2];
}

async function count(channel)
{
	return (await fetch(channel)).length;
}

async function stats(){

	a = await count(accepted);
	p = await count(posted);
	r = await count(rejected);

	return(
		`— ${a} пост${ending(a, ["", "а", "ов"])} ожида${ending(a, ["ет", "ют", "ют"])} публикации;\n` +
		`— ${p} пост${ending(p, ["", "а", "ов"])} опубликован${ending(p, ["", "о", "о"])};\n` +
		`— ${r} пост${ending(r, ["", "а", "ов"])} отклон${ending(r, ["ён", "ено", "ено"])};`
	);
}

async function sort(channel){

	let messages = await fetch(channel)
	let n = 0

	for(let i = messages.length - 1; i >= 0; i--){

		let message = messages[i]

		if (message.reactions.cache.find(reaction => reaction.emoji.name === '🥝') !== undefined){
			//console.log("Kiwi emoji found in \"" + message.content + "\"") 
			await move(message, posted)
			n = n + 1
			continue
		}

		if (message.reactions.cache.find(reaction => reaction.emoji.name === '✅') !== undefined){
			//console.log("Mark emoji found in \"" + message.content + "\"") 
			await move(message, accepted)
			n = n + 1
			continue
		}

		if (message.reactions.cache.find(reaction => reaction.emoji.name === '❌') !== undefined){
			//console.log("Cross emoji found in \"" + message.content + "\"") 
			await move(message, rejected)
			n = n + 1
			continue
		}
	}

	if (n > 0)
		console.log(`${n} message${n > 1 ? "s" : ""} sorted in ${channel.name}!`)
	else
		console.log(`No messages to sort in ${channel.name}!`)
}

async function moveAll(channel, destination){

	messages = await fetch(channel)
	
	for(let i = messages.length - 1; i >= 0; i--)
		await move(messages[i], destination)

	if (messages.length > 0)
		console.log(`${messages.length} messages moved from ${channel.name} to ${destination.name}`);
	else
		console.log(`No messages to move in ${channel.name}`);
}

async function move(source, destination){

	let content = source.content;
	let components = createReactionBar(source)
	let attachments = getAttachments(source);

	let message = {};

	if (content)
		message.content = content;
	
	if (components)
		message.components = components;
	
	if (attachments)
		message.files = attachments;
	
	if (message === {})
		return;
	
	destination.send(message)
		.then(source.delete())
		.catch(console.error);
}

function getAttachments(source)
{
	if (source.attachments.size > 0)
	{
		attachments = [];
		source.attachments.forEach(attachment => attachments.push(attachment));

		return attachments;
	}
	return null;
}

function createReactionBar(source, filter = ['🥝', '✅', '❌'])
{

	if (source.components.length > 0)

		return source.components;

	let actionRow = new ActionRowBuilder()
	let n = 0

	source.reactions.cache.forEach( reaction => {
		if (!filter.includes(reaction.emoji.name) && n < 5)
		{
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(reaction.emoji.name)
					.setLabel(reaction.count.toString())
					.setEmoji(getEmoji(reaction.emoji))
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(true)
			)
			n = n + 1
		}
	})

	if (n !== 0)
		return [actionRow];
	
	return null;
}

function getEmoji(emoji)
{
	if (emoji.id != null)
		return emoji.id;
	
	return emoji.name;
}

async function clean(channel){

	messages = await fetch(channel)

	for(let i = messages.length - 1; i >= 0; i--){

		message = messages[i]

		if (message.type === 18){
			await message.delete()
				.catch(console.error)
		}
	}
}

// function copyReactions(source, destination, filter)
// {
// 	let footer = ""
// 	let embed

// 	source.reactions.cache.forEach( reaction => {
// 		if (!filter.includes(reaction.emoji.name))
// 			footer += `${reaction.emoji.name} ${reaction.count}  `
// 	})

// 	if (source.embeds.length > 0 && source.embeds[0].data.footer)
// 		footer += source.embeds[0].data.footer.text

// 	if (destination.embeds.length > 0)
// 		embed = new EmbedBuilder(destination.embeds[0].data)
// 	else
// 		embed = new EmbedBuilder()

// 	if (footer !== ""){
		
// 		embed.setFooter({ text: footer })
// 		destination.edit({ embeds: [embed] });
// 	}
// }

// async function getLast(channel){

// 	messages = channel.messages.fetch({ limit: 3 })
// 		.then(messages => {
// 			messages.forEach(message => {
// 				console.log(message)
// 			})
// 		})
// }

// async function embedTest(channel){

// 	let footer = ""

// 	messages = channel.messages.fetch({ limit: 1 })
// 		.then(messages => {
// 			messages.forEach(message => {
// 				console.log(message)
// 				message.reactions.cache.forEach( reaction => {
// 					if (reaction.emoji.name !== '🥝')
// 						footer += `${reaction.emoji.name} ${reaction.count}   `
// 				})

// 				channel.send("https://twitter.com/JoeCreates/status/1580718229672321024")
// 					.then( post => {

// 						let embed = post.embeds[0].data
// 						let embedFooter = new EmbedBuilder(embed)
// 							.setFooter({ text: footer })
			
// 							post.edit({ embeds: [embedFooter] });
// 					})
// 			})
// 		})

// 	// await channel.send("https://twitter.com/JoeCreates/status/1580718229672321024")
// 	// 	.then( message => {

// 	// 		embed = message.embeds[0].data

// 	// 		let embedFooter = new EmbedBuilder(embed)
// 	// 			.setFooter({ text: ":thumbsup: 3, :thumbsdown: 2" })

// 	// 		message.edit({ embeds: [embedFooter] });
// 	// 	})
// 	// 	.catch(console.error)
// }

// async function test(channel){
	
// 	messages = channel.messages.fetch({ limit: 3 })
// 		.then(messages => {
// 			messages.forEach(message => {
// 				if (message.attachments.size > 0)
// 				{
// 					console.log(message)

// 					attachments = []
// 					message.attachments.forEach(attachment => attachments.push(attachment))

// 					channel.send({ files: attachments }).catch(console.error)
// 				}
// 			})
// 		})
// }

// function fetch(channel){

// 	messages = channel.messages.fetch({ limit: 100 })
// 		.then(messagePage => {
// 			if (messagePage.size < 100)
// 				return messages 
// 		});
	
// 	message = messages.at(messages.size - 1)

// 	while(message){

// 		channel.messages.fetch({ limit: 100, before: message.id })
// 			.then(messagePage => {
// 				messages.concat()
// 			})
// 	}

// 	channel.messages.fetch({ cache: false, limit: 100, before: messages.at(messages.size - 1) })
// 		.then( messagePage => {
// 			messages = messages.concat(messagePage)
// 			if (messagePage.size < 100)
// 				return messages
// 		})
// }