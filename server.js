const redis = require('redis');
const Hapi = require('hapi');
const fetch = require('node-fetch');

const server = new Hapi.Server();
const REDIS_PORT = 6379;
const client = redis.createClient(REDIS_PORT);

server.connection({
    port: 3000,
    host: 'localhost'
});

server.start(function(err) {
    if(err){
        console.log('Error in starting server');
    }
    console.log('Server started in port 3000');
});

server.route({
    method:'GET',
    path: '/',
    handler: function (request, response) {
        return response('The server is started successfully: Home Page');
    }
});

server.route({
    method: 'GET',
    path: '/repos/{username}',
    handler: async function (request, response) {
        try {
            const { username } = request.params;
            //get value using key from redis db
            client.get(username, (err, data) => {
                if(data !== null) {
                    console.log('Data retrieved from Redis cache', data);
                    return response(showRepos(username, data));
                } else {
                    console.log('Fetching Data from Git...');
                    (async() => {
                        const res = await fetch(`https://api.github.com/users/${username}`);
                        const data = await res.json();
                        const public_repos = data.public_repos;
                        const loginID = data.login;

                        //set value to redis db
                        client.setex(username, 3600, public_repos);
                        return response(showRepos(loginID, public_repos));
                    })();
                }
            });
        } catch(err) {
            console.log('Error in getRepos', err);
            return response(err);
        }
    }
});

function showRepos(name, public_repos) {
    return `<h2>${name} has ${public_repos} repositories in Github`;
}
