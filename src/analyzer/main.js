function Trace() {
    this.events = [];
    this.t_min = 0;
    this.p_min = 0;

    this.p_span = 0;
    this.t_span = 0;
}

Trace.prototype.parse = function(line) {
    var words = line.split(' ');

    if (!line) return;
    if (words[0] != 'alloc' && words[0] != 'free') return;

    this.events.push({
        event: words[0],
        pointer: parseInt(words[1], 10),
        length: parseInt(words[2], 10),
        time: parseInt(words[3], 10)
        });
}

Trace.prototype.findMinAndMax = function(line) {
    var t_min = Number.POSITIVE_INFINITY;
    var t_max = Number.NEGATIVE_INFINITY;
    var p_min = Number.POSITIVE_INFINITY;
    var p_max = Number.NEGATIVE_INFINITY;

    var lengthsByStarts = {};

    $.each(this.events, function(i, event) {
        t_min = Math.min(t_min, event.time);
        t_max = Math.max(t_max, event.time);
        p_min = Math.min(p_min, event.pointer);
        p_max = Math.max(p_max, event.pointer + event.length);

        // Find alloc lengths corresponding to free events
        if (event.event == 'alloc') lengthsByStarts[event.pointer] = event.length;
        if (event.event == 'free' && event.pointer in lengthsByStarts) {
            event.length = lengthsByStarts[event.pointer];
            delete lengthsByStarts[event.pointer];
        }
    });

    // Adjust pees and tees to be relative
    $.each(this.events, function(i, event) {
        event.time -= t_min;
        event.pointer -= p_min;
    });

    this.t_min = t_min;
    this.t_span = t_max - t_min + 1;
    this.p_min = p_min;
    this.p_span = p_max - p_min + 1;
}

var TraceVisualization = function(canvas, trace) {
    var ctx = canvas.getContext('2d');

    var scale = Math.sqrt(canvas.width * canvas.height / trace.p_span);
    var p_per_row = Math.floor(canvas.width / scale);

    var putPointer = function(p, color) {
        var y = Math.floor(p / p_per_row);
        var x = p - y * p_per_row;

        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x * scale, y * scale, scale, scale);
    }

    // Wrap the rainbow colors every 'this many' seconds
    var t_wrapAround = Math.min(trace.t_span, 360);
    var hue_offset = 0.4;

    var draw1 = function(e, forwards) {
        if (e == -1) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        else {
            var index = Math.floor(e / 2);
            var flash = e % 2 == (forwards ? 0 : 1);

            var event = trace.events[index];

            var timeColor = tinycolor({ h: (event.time / t_wrapAround + hue_offset) * 360 % 360,
                                        s: 0.8,
                                        v: 0.8 }).toHexString();

            for (var p = event.pointer; p < event.pointer + event.length; p++) {
                putPointer(p, flash ? 'white' :
                              event.event == 'free' ? 'black' :
                              event.event == 'alloc' ? timeColor :
                              'purple');
            }
        }
    };

    /**
     * Draw from event [e0..e1)
     *
     * -1 is special, which will blank out the screen
     */
    this.draw = function(e0, e1) {
        if (e1 === undefined) e1 = e0 + 1;

        var d = e0 > e1 ? -1 : 1;
        for (var e = e0; e != e1; e += d) 
            draw1(e, d > 0);
    }

    this.e_max = function() {
        return trace.events.length * 2;
    }
}

function parse(body) {
    var lines = body.split('\n');
    var trace = new Trace();
    for (var i = 0; i < lines.length; i++)
        trace.parse(lines[i]);
    trace.findMinAndMax();

    var vis = new TraceVisualization($('#canvas').get(0), trace);

    return $.Deferred().resolve(vis).promise();
}

function readLocalFile(file) {
    var deferred = $.Deferred();

    var reader = new FileReader();
    reader.onload = function(theFile) {
        deferred.resolve(reader.result);
    };
    reader.readAsText(file);

    return deferred.promise();
}

function Player() {
    var e = 0;
    var vis;
    var t_per_step;
    var timer;

    var self = this;

    var step = function() {
        vis.draw(e++);

        if (e >= vis.e_max())
            self.pause();
    }

    self.pause = function() {
        window.clearInterval(timer);
    }

    self.play = function() {
        window.clearInterval(timer);
        timer = setInterval(step, t_per_step);
    }

    self.restart = function() {
        vis.draw(-1);
        e = 0;
        self.play();
    }

    self.start = function(viz) {
        vis = viz;

        // Aim for 1 minute playback with a max of 500ms second per step
        t_per_step = Math.min(60000 / vis.e_max(), 500);

        self.restart();
    }
}

var player = new Player();

$('#load-btn').click(function() {
    var picker = $('#file-picker').get(0);
    var files = picker.files;
    if (files.length == 0) {
        alert('Select a file first.');
        return;
    }

    readLocalFile(files[0])
        .then(parse)
        .then(player.start);
});

$('#pause-btn').click(player.pause);
$('#play-btn').click(player.play);
$('#restart-btn').click(player.restart);
