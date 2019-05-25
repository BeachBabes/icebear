const { Client, Util } = require('discord.js');
const discord = require('discord.js');
const PREFIX = ('i.')
const GOOGLE_API_KEY = ('AIzaSyCIRU11Ooxr7JYGc35F9d-VqBp190xBfzc')
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const Console = console;
let options = {
    total: "565272404360822794",
    users: "565272460891783168",
	bots: "565272492000935967",
	announce: "559509706088120320"
};

const client = new Client({ disableEveryone: true });

const youtube = new YouTube(GOOGLE_API_KEY);

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on('disconnect', () => console.log('I just disconnected, making sure you know, I will reconnect now...'));

client.on('reconnecting', () => console.log('I am reconnecting now!'));

client.on('ready', function(){
    console.log("Gordon ready to beat minors!");

	client.user.setPresence({ game: { name: 'your songs', type: "streaming", url: "https://www.twitch.tv/yoursongs"}});
	
    client.user.setStatus('online')
});



client.on('message', async msg => {
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(PREFIX.length)
	if(command === 'help')
	{
		var help = new discord.RichEmbed()
		.setColor('#ff0000')
		.setTitle('Help command')
		.setDescription('The avaliable music commands are play, stop, skip, np (Now playing), volume, queue, pause, and resume')
		.setFooter('Bot created by Alfred')
		msg.channel.sendEmbed(help)
	}

	if(command === 'invite')
	{
		var invite = new discord.RichEmbed()
		.setColor('#ff0000')
		.setTitle('Invite Command')
		.setDescription('Click here to invite Icebear!')
		.setURL('https://discordapp.com/oauth2/authorize?client_id=563104129589837865&scope=bot&permissions=8')
		.setFooter('Bot created by Alfred')
		msg.channel.sendEmbed(invite)
	}

	if(command === 'mirror')
	{
		msg.channel.send(msg.author.avatarURL)
	}

	if (command === 'play') {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('I\'m sorry but you need to be in a voice channel to play music!')
		msg.delete()
		.then(msg => msg.delete(10000))
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!')
			.then(msg => msg.delete(10000))
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!')
			.then(msg => msg.delete(10000))
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); 
				await handleVideo(video2, msg, voiceChannel, true); 
			}
			return msg.channel.send(`Success! Playlist: **${playlist.title}** has been added to the queue!`)
			.then(msg => msg.delete(10000))
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 10);
					let index = 0;
					msg.channel.send(`
__**Song selection:**__

${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}

Type a number 1-10 to select a song!
					`)
					.then(msg => msg.delete(15000))
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						})
					} catch (err) {
						console.error(err);
						return msg.channel.send('You didnt enter a number in time!')
						.then(msg => msg.delete(10000))
					}
					const videoIndex = parseInt(response.first().content)
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send('No search results found.')
					.then(msg => msg.delete(10000))
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === 'skip') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!')
		msg.delete()
		.then(msg => msg.delete(10000))
		if (!serverQueue) return msg.channel.send('There is nothing playing!')
		msg.delete()
		.then(msg => msg.delete(10000))
		serverQueue.connection.dispatcher.end('Skip command has been used!');
		return undefined;
	} else if (command === 'stop') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!')
		msg.delete()
		.then(msg => msg.delete(10000))
		if (!serverQueue) return msg.channel.send('Theres nothing playing idot')
		msg.delete()
		.then(msg => msg.delete(10000))
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('Stop command has been used!');
		return undefined;
	} else if (command === 'volume') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		msg.delete()
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		msg.delete()
		if (!args[1]) return msg.channel.send(`The current volume is: **${serverQueue.volume}**`);
		msg.delete()
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send(`I set the volume to: **${args[1]}**`)
		.then(msg => msg.delete(10000))
	} else if (command === 'np') {
		if (!serverQueue) return msg.channel.send('There is nothing playing!');
		return msg.channel.send(`Now playing: **${serverQueue.songs[0].title}**`)		
		.then(msg => msg.delete(10000))
	} else if (command === 'queue') {
		if (!serverQueue) return msg.channel.send('There is nothing playing!')
		.then(msg => msg.delete(10000))
		return msg.channel.send(`
__**Song queue:**__

${serverQueue.songs.map(song => `**>** ${song.title}`).join('\n')}

**Now playing:** ${serverQueue.songs[0].title}
		`)
		.then(msg => msg.delete(10000))
	} else if (command === 'pause') {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send(':pause_button: Music paused!')
			.then(msg => msg.delete(10000))
		}
		return msg.channel.send('There is nothing playing.')
		.then(msg => msg.delete(10000))
	} else if (command === 'resume') {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send(':play_button: Music unpaused!')
			.then(msg => msg.delete(10000))
		}
		return msg.channel.send('There is nothing playing.')
		.then(msg => msg.delete(10000))
	}

	return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`Sorry, I can't join the channel!`)
			.then(msg => msg.delete(10000))
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return msg.channel.send(`${song.title} has been added to your queue!`)
		.then(msg => msg.delete(10000))
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`Now playing: **${song.title}!**`)
	.then(msg => msg.delete(10000))
}

client.on("guildMemberAdd", (member) => {
	//All choices are optional here. Bot wont work if the channel ID's are wrong. How to properly get ID's read in README.md 
	try {
		member.guild.channels.get(options.total).setName(`Total Members: ${member.guild.memberCount}`); // You can change this text, but still keep ${guild.memberCount}, as it defines total members.
		member.guild.channels.get(options.users).setName(`Users: ${member.guild.members.filter((m) => !m.user.bot).size}`); // This text is also changeable, still keep the code in ${}
		member.guild.channels.get(options.bots).setName(`Bots: ${member.guild.members.filter((m) => m.user.bot).size}`); // This text is also changeable, still keep the code in ${}
	
	}
	catch (e) {
	Console.log(e);
	}
});
client.on("guildMemberRemove", (member) => {
	//All choices are optional here. Bot wont work if the channel ID's are wrong. How to properly get ID's read in README.md 
	try {
		member.guild.channels.get(options.total).setName(`Total Members: ${member.guild.memberCount}`); // You can change this text, but still keep ${guild.memberCount}, as it defines total members.
		member.guild.channels.get(options.users).setName(`Users: ${member.guild.members.filter((m) => !m.user.bot).size}`); // This text is also changeable, still keep the code in ${}'s
		member.guild.channels.get(options.bots).setName(`Bots: ${member.guild.members.filter((m) => m.user.bot).size}`); // This text is also changeable, still keep the code in ${}'s
	
	}
	catch (e) {
	Console.log(e);
	}
});

client.login(process.env.BOT_TOKEN);
