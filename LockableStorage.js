/**
Copyright (c) 2012, Benjamin Dumke-von der Ehe, 2017 Chris Webb

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
*/

/*
 LockableStorage.lock(key, lockAquiredCallback);
 LockableStorage.get(key, valueAcquiredCallback);  // valueAcquiredCallback = function(value)
 LockableStorage.set(key, value, valueSetCallback);
 LockableStorage.remove(key, valueRemovedCallback)
*/


/*globals self: false */
var globalObj = window || self;
globalObj.LockableStorage = new function () {

  var now = function() {
    return new Date().getTime();
  };
  
  var someNumber = function() {
    return Math.random() * 1000000000 | 0;
  };

  var myId = now() + ":" + someNumber();
      
  var getter = function(lskey) {
    return function () {
      var value = localStorage[lskey];
      if (!value)
        return undefined;
      
      var splitted = value.split(/\|/);
      if (parseInt(splitted[1]) < now()) 
        return undefined;

      return splitted[0];
    }
  };
  
  var _mutexTransaction = function(key, callback, synchronous) {
    var xKey = key + "__MUTEX_x",
        yKey = key + "__MUTEX_y",
        getY = getter(yKey),
        criticalSection = function() {
          try {
            callback();
          } finally {
            localStorage.removeItem(yKey);
          }
        };
      
    localStorage[xKey] = myId;
    if (getY()) {
      if (!synchronous)
        setTimeout(function () { _mutexTransaction(key, callback, synchronous); }, 0);
      return false;
    }
    localStorage[yKey] = myId + "|" + (now() + 40);
    
    if (localStorage[xKey] !== myId) {
      if (!synchronous) {
        setTimeout(function () {
          if (getY() !== myId) {
            setTimeout(function () { _mutexTransaction(key, callback, synchronous); }, 0);
          } else {
            criticalSection();
          }
        }, 50)
      }
      return false;
    } else {
      criticalSection();
      return true;
    }
  }
  
  var lockImpl = function(key, callback, maxDuration, synchronous) {

    maxDuration = maxDuration || 5000;
      
    var mutexKey = key + "__MUTEX",
        getMutex = getter(mutexKey),
        mutexValue = myId + ":" + someNumber() + "|" + (now() + maxDuration),
        restart = function() {
          setTimeout(function () { lockImpl(key, callback, maxDuration - 10, synchronous); }, 10);
        },
        mutexAquired = function() {
          try {
            callback();
          } finally {
            _mutexTransaction(key, function () {
              if (localStorage[mutexKey] !== mutexValue)
                throw key + " was locked by a different process while I held the lock";
                  
              localStorage.removeItem(mutexKey);
            });
          }
        };

    if (getMutex()) {
      if (!synchronous)
          restart();
      return false;
    }

    var aquiredSynchronously = _mutexTransaction(key, function () {
      if (getMutex()) {
        if (!synchronous)
          restart();
        return false;
      }
      localStorage[mutexKey] = mutexValue;
      if (!synchronous) {
        setTimeout(mutexAquired, 0);
      }
    }, synchronous);
      
    if (synchronous && aquiredSynchronously) {
      mutexAquired();
      return true;
    }
    return false;
  };

  var getImpl = function (key, callback, maxDuration, synchronous) {
    var status = false,
        getImplCallback = function() {
          var value = localStorage[key];
          setTimeout(function() {
            callback.call(this, value);
          }, 0);
        };

    if (callback.call) 
      status = lockImpl(key, getImplCallback, maxDuration, synchronous);
    if (synchronous)
      return status;
  };

  var setImpl = function(key, value, callback, maxDuration, synchronous) {
    var status = false,
        setImplCallback = function() {
          localStorage[key] = value;
          if (callback.call) {
            setTimeout(function() {
              callback.call(this);
            }, 0);
          }
        };
    status = lockImpl(key, setImplCallback, maxDuration, synchronous);
    if (synchronous)
      return status;
  };

  var removeImpl = function(key, callback, maxDuration, synchronous) {
    var status = false,
        removeImplCallback = function() {
          localStorage.removeItem(key);
          if (callback.call) {
            setTimeout(function() {
              callback.call(this);
            }, 0);
          }
        };
    status = lockImpl(key, removeImplCallback, maxDuration, synchronous);
    if (synchronous)
      return status;
  };
  
  this.lock = function (key, lockAquiredCallback, maxDuration) { lockImpl(key, lockAquiredCallback, maxDuration, false); };
  this.trySyncLock = function (key, lockAquiredCallback, maxDuration) { return lockImpl(key, lockAquiredCallback, maxDuration, true); };
  this.get = function (key, valueAcquiredCallback, maxDuration) { getImpl(key, valueAcquiredCallback, maxDuration, false); };
  this.tryGet = function (key, valueAcquiredCallback, maxDuration) { return getImpl(key, valueAcquiredCallback, maxDuration, true); };
  this.set = function (key, value, valueSetCallback, maxDuration) { setImpl(key, value, valueSetCallback, maxDuration, false); };
  this.trySet = function (key, value, valueSetCallback, maxDuration) { return setImpl(key, value, valueSetCallback, maxDuration, true); };
  this.remove = function (key, valueRemovedCallback, maxDuration) { removeImpl(key, value, valueRemovedCallback, maxDuration, false); };
  this.tryRemove = function (key, valueRemovedCallback, maxDuration) { return removeImpl(key, value, valueRemovedCallback, maxDuration, true); };
};