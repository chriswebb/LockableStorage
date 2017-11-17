# LockableStorage

Concurrency and locking for HTML5 localStorage.

# Install

    bower install lockablestorage
    
# Use

    LockableStorage.lock('key', function () {
        // exclusive access to localStorage['key']
    });

    LockableStorage.get('key', function(value) { 
        // gets localStorage['key']
        // uses value as a paramter to the callback function
        // callback does not hold the lock.
    });

    LockableStorage.set('key', 'value', function() {
	// sets localStorage['key'] to 'value' then runs callback
	// callback does not hold the lock.
        // can be removed if no-callback necessary.
    });

    LockableStorage.remove('key', function(value) { 
	// value of key is removed then runs callback
        // callback does not hold the lock.
    });

# Author

This code was written by [Benjamin Dumke-von der Ehe](http://balpha.de/) and described in this post: [http://balpha.de/2012/03/javascript-concurrency-and-locking-the-html5-localstorage/](http://balpha.de/2012/03/javascript-concurrency-and-locking-the-html5-localstorage/).

Bower and README from https://github.com/elad/LockableStorage

And updates with helper functions and jshint warnings from Chris Webb
