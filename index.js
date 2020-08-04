const exec = require('child_process').exec
const escape = require('shell-escape')
const mkdirp = require('mkdirp')
const uid = require('uid2')
const path = require('path')
const fs = require('fs')

function gify(input, output, opts, fn) {
  if (!input) throw new Error('input filename required')
  if (!output) throw new Error('output filename required')

  // options
  if ('function' == typeof opts) {
    fn = opts
    opts = {}
  } else {
    opts = opts || {}
  }

  // dims
  var w = opts.width
  var h = opts.height
  var rate = opts.rate || 10
  var delay = opts.delay || 'auto'

  // auto delay
  if ('auto' == delay) {
    delay = 1000 / rate / 10 | 0
  }

  // scale
  var scale
  if (w) scale = w + ':-1'
  else if (h) scale = '-1:' + h
  else scale = '500:-1'

  // tmpfile(s)
  var id = uid(10);
  var dir = path.resolve('/tmp/' + id)
  var tmp = path.join(dir, '/%04d.png')
  
  // escape paths
  input = escape([input])
  output = escape([output])
  
  // normalize
  if (process.platform === 'win32') {
    input = input.replace(/^'|'$/g, '"')
    output = output.replace(/^'|'$/g, '"')
  }
  // delete if error occurs
  function gc(err) {
    exec('rm -fr ' + dir)
    fn(err)
  }

  mkdirp(dir, function (err) {
    if (err) return fn(err)

    // convert to gif
    var cmd = ['ffmpeg']
    cmd.push('-i', input)
    cmd.push('-filter:v', 'scale=' + scale)
    cmd.push('-r', String(rate))
    if (opts.start) cmd.push('-ss', String(opts.start))
    if (opts.duration) cmd.push('-t', String(opts.duration))
    cmd.push(tmp)
    cmd = cmd.join(' ')

    exec(cmd, function (err) {
      if (err) return gc(err)
      var cmd
      var wildcard = path.join(dir, '/*.png')

      cmd = ['gm', 'convert']
      cmd.push('-delay', String(delay || 0))
      cmd.push('-loop', '0')
      cmd.push(wildcard)
      cmd.push(output)
      cmd = cmd.join(' ')

      exec(cmd, gc)
    })
  })

}

var opts = {
  width: 300,
  duration: 5
};

console.time('convert');
gify('test.mp4', 'test.gif', opts, function(err){
  if (err) throw err;
  console.timeEnd('convert');
  var s = fs.statSync('test.gif');
  console.log('size: %smb', s.size / 1024 / 1024 | 0);  
});
