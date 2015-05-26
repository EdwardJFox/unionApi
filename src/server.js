var express = require('express');
var async = require('async');
var moment = require('moment');
var request = require('request');
var app = express();

var newsData = {};
var verboseNewsData = {};
var eventsData = {};
var defaults = {
    limit : 10,
    page : 0
};


/* ROUTES*/
app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/news/', function(req, res){
    var params = {};
    if(req.query.limit){
        params.limit = parseInt(req.query.limit);
    }
    else {
        params.limit = defaults.limit;
    }
    if(req.query.page){
        params.page = parseInt(req.query.page) - 1;
    }
    else {
        params.page = defaults.page;
    }
    if(req.query.tags){
        params.tags = req.query.tags;
    }
    else {
        params.tags = [];
    }
    if(req.query.verbose == "true"){
        sendVerboseNews(params, res);
    }
    else {
        sendNews(params, res);
    }
});

//Get a specific news article with ID
app.get('/news/id/:id/', function(req, res){
    findNewsById(parseInt(req.params.id), res);
});

//Get events
app.get('/events/', function(req, res){
    var params = {};
    if(req.query.limit){
        params.limit = parseInt(req.query.limit);
    }
    else {
        params.limit = defaults.limit;
    }
    if(req.query.page){
        params.page = parseInt(req.query.page) - 1;
    }

    else {
        params.page = defaults.page;
    }
    if(req.query.type){
        findEventsByType(params, res, req.query.type);
    }
    else {
        sendEvents(params, res);
    }
});

function findNewsById(id, res){
    for(var i = 0; i < newsData.news.length; i++){
        if(newsData.news[i].Id === id){
            res.json(verboseNewsData.news[i]);
            break;
        }
    }
    res.json({
        error: "Unable to find that ID"
    });
}

function sendNews(params, res){
    var toSend = {
        news : []
    };
    if(params.tags.length > 0){
        var t = params.tags.split(",");
        for(var i = 0; i < newsData.news.length; i++){
            for(var j = 0; j < t.length; j++){
                if(newsData.news[i].Tags.indexOf(t[j]) >= 0){
                    toSend.news.push(newsData.news[i]);
                }
            }
        }
        if(toSend.news.length == 0){
            toSend = {error:"No news found with tag(s) " + t};
        }
    }
    else {
        toSend = {
            news : newsData.news.slice(params.page*params.limit, (params.page*params.limit) + params.limit)
        };
    }
    res.json(toSend);
}

function sendVerboseNews(params, res){
    var toSend = {
        news : verboseNewsData.news.slice(params.page*params.limit, (params.page*params.limit) + params.limit)
    };
    res.json(toSend);
}

function sendEvents(params, res){
    var toSend = {
        events : eventsData.events.slice(params.page*params.limit, (params.page*params.limit) + params.limit)
    };
    res.json(toSend);
}

function findEventsByType(params, res, type){
    var t = type.split(",");
    var toReturn = {
        events : []
    };
    for(var i = 0; i < eventsData.events.length; i++){
        for(var j = 0; j < t.length; j++){
            if(eventsData.events[i].Types.indexOf(t[j]) >= 0){
                toReturn.events.push(eventsData.events[i]);
            }
        }
    }
    if(toReturn.events.length == 0){
        res.json({error:"No events found with tag(s) " + t})
    }
    else {
        var toSend = {
            events: toReturn.events.slice(params.page * params.limit, (params.page * params.limit) + params.limit)
        };
        res.json(toSend);
    }
}

function getNewsData(url){
    request(url, function(error, response, html) {
        var data = JSON.parse(html);
        sortNewsByDate(data, function(d){
            verboseNewsData = d;
            newsData = {
                news : []
            };
            for(var i = 0; i < verboseNewsData.news.length; i++){
                newsData.news.push(JSON.parse(JSON.stringify(verboseNewsData.news[i])));
                delete newsData.news[i].BodyText;
                delete newsData.news[i].ModifiedDate;
            }
        })
    });
}
function sortNewsByDate(data, callback){
    var temp = {
        news : []
    };
    temp.news.push(data.News[0]);
    for(var i = 1; i < data.News.length; i++){
        var curTime = moment(data.News[i].PublishedDate).unix();
        for(var j = 0; j < temp.news.length; j++){
            var thisTime = moment(temp.news[j].PublishedDate).unix();
            if(curTime > thisTime && j+1 == temp.news.length){
                temp.news.push(data.News[i]);
                break;
            }
            else if(curTime < thisTime){
                temp.news.splice(j, 0, data.News[i]);
                break;
            }
        }
        if(i+1 == data.News.length){
            temp.news.reverse();
            callback(temp);
        }
    }
}

function getEventsData(url){
    request(url, function(error, response, html) {
        var data = JSON.parse(html);
        sortEventsByDate(data, function(d){
            eventsData = d;
        })
    });
}
function sortEventsByDate(data, callback){
    callback(data);
    var temp = {
        events : []
    };
    temp.events.push(data.Events[0]);
    for(var i = 1; i < data.Events.length; i++){
        var curTime = moment(data.Events[i].StartDate).unix();
        for(var j = 0; j < temp.events.length; j++){
            var thisTime = moment(temp.events[j].StartDate).unix();
            if(curTime > thisTime && j+1 == temp.events.length){
                temp.events.push(data.Events[i]);
                break;
            }
            else if(curTime < thisTime){
                temp.events.splice(j, 0, data.Events[i]);
                break;
            }
        }
        if(i+1 == data.Events.length){
            callback(temp);
        }
    }
}

var server = app.listen(process.env.PORT || 3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});

//Need to make it so it updates hourly
getNewsData("http://www.staffsunion.com/svc/json/JsonNewsFeedSvc.ashx");
getEventsData("http://www.staffsunion.com/svc/json/JsonEventsFeedSvc.ashx");