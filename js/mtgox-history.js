//
// mtgox-history.js
//

(function(){

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// INITIALIZE PUBNUB
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    var pubnub = PUBNUB.init({
        subscribe_key : 'sub-c-05de75e4-d22c-11e4-95a3-0619f8945a4f'
    });

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// MTGOX HISTORY INTERFACE
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    window.MTGOX = {
        history : {
            hourly : hourly,
            full   : full
        }
    };

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// GET ALL DATA FOREVER (WITH LIMIT OF COURSE)
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

    /*
     MTGOX.history.full({
     limit   : 1000,
     channel : 'd5f06780-30a8-4a48-a2f8-7ed181b4a13f',
     data    : function(messages) { console.log(messages)        },
     error   : function(e)        { console.log("NETWORK ERROR") }
     });
     */

    function full(args) {
        var chan     = args['channel'] ||'d5f06780-30a8-4a48-a2f8-7ed181b4a13f'
            ,   callback = args['data']   || function(){}
            ,   error    = args['error']  || function(){}
            ,   limit    = +args['limit'] || 5000
            ,   start    = 0
            ,   count    = 100
            ,   history  = []
            ,   params   = {
                channel  : chan,
                count    : count,
                callback : function(messages) {
                    var msgs = messages[0];
                    start = messages[1];
                    params.start = start;
                    PUBNUB.each( msgs.reverse(), function(m) {history.push(m)} );

                    if (history.length >= limit) return callback(history);
                    if (msgs.length < count)     return callback(history);

                    count = 100;
                    add_messages();
                },
                error : function(e) {
                    callback(history);
                    error(history);
                }
            };

        add_messages();
        function add_messages() { pubnub.history(params) }
    }

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// GET 24 HOURS IN HOURLY INCREMENTS
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

    /*
     MTGOX.history.hourly({
     channel : 'd5f06780-30a8-4a48-a2f8-7ed181b4a13f',
     data    : function(response) { console.log(response) },
     error   : function()         { console.log('ERROR')  }
     });
     */

    function hourly(setup) {
        var limit = 24;
        var count = 0;
        var chan  = setup['channel'] ||'d5f06780-30a8-4a48-a2f8-7ed181b4a13f';
        var cb    = setup['data']    || function(){};
        var eb    = setup['error']   || function(){};
        var now   = new Date();

        now.setUTCHours(0);
        now.setUTCMinutes(0);
        now.setUTCSeconds(0);
        now.setUTCMilliseconds(0);

        var utc_now = now.getTime();
        var vectors = [];

        PUBNUB.each( (new Array(limit)).join(',').split(','), function( _, d ) {
            var day = utc_now - 3600000 * d;
            pubnub.history({
                limit    : 1,
                channel  : chan,
                start    : day * 10000,
                error    : function() { count++; eb(); },
                callback : function(messages) {
                    // DONE?
                    if (++count == limit) return cb(vectors);

                    // ADD TIME SLICES
                    var res = +(((messages[0][0]||{}).ticker||{}).avg||{}).value;
                    res && vectors.push([ new Date(day).getUTCHours(), res ]);

                    // KEEP IT SORTED
                    vectors.sort(function(a,b){ return a[0] > b[0] && -1 || 1 });
                }
            })
        } );
    }

})();