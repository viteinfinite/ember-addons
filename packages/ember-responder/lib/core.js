var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

Ember.responder = Ember.Object.create({
  firstResponder: null,
  defaultResponder: null,
  lastResponder: null,

  respondersChain: {},

  becomeFirstResponder: function(view) {
    if (get(view, 'isFirstResponder')) { return; }
    var currentResponder = get(this, 'firstResponder');
    if (currentResponder) {
      this.resignFirstResponder(currentResponder);
    }

    view.fire('willBecameFirstResponder');
    set(this, 'firstResponder', view);

    view.focus();
    view.fire('didBecomeFirstResponder');
  },

  resignFirstResponder: function(view) {
    if (!get(view, 'isFirstResponder')) { return; }

    view.fire('willLoseFirstResponder');
    set(this, 'firstResponder', null);

    view.blur();
    view.fire('didLoseFirstResponder');
  },

  goToNextResponder: function(view, backward) {
    if (!get(view, 'isFirstResponder')) { return; }

    var nextResponder = (backward ? get(view, 'lastResponder') : get(view, 'nextResponder'));
    if (backward && nextResponder) {
      set(view, 'lastResponder', null);
    } else if (!backward && nextResponder) {
      set(nextResponder, 'lastResponder', view);
    }

    nextResponder = nextResponder || this.nextInRespondersChain(view, get(view, 'responderGroup'), backward) || get(this, 'defaultResponder');
    if (nextResponder) {
      Ember.run.once(this, 'becomeFirstResponder', nextResponder);
    } else {
      Ember.run.once(this, 'resignFirstResponder', view);
    }
  },

  previousValidResponder: function() {},
  nextValidResponder: function() {},

  addViewToRespondersChain: function(view) {
    var chain = get(this, 'respondersChain'), responderGroup = get(view, 'responderGroup');
    chain = chain[responderGroup] = chain[responderGroup] || Ember.A();
    if (!chain.contains(view)) {
      chain.addObject(view);
    }
  },

  removeViewFromRespondersChain: function(view) {
    var chain = get(this, 'respondersChain'), responderGroup = get(view, 'responderGroup');
    chain = chain[responderGroup] = chain[responderGroup] || Ember.A();
    if (chain.contains(view)) {
      chain.removeObject(view);
    }
  },

  nextInRespondersChain: function(view, responderGroup, backward) {
    var chain = getPath(this, 'respondersChain.%@'.fmt(responderGroup)),
      lng = get(chain, 'length'), idx;
    if (backward) { chain = Ember.copy(chain).reverse(); }
    idx = chain.indexOf(view);
    idx = idx + 1;
    idx = idx === lng ? 0 : idx;
    view = chain.nextObject(idx);
    while (view && !get(view, 'acceptsFirstResponder')) {
      view = chain.nextObject(idx);
    }
    return view;
  }
});

Ember.ResponderSupport = Ember.Mixin.create({

  hasResponderSupport: true,

  willBecameFirstResponder: Ember.K,
  didBecomeFirstResponder: Ember.K,

  willLoseFirstResponder: Ember.K,
  didLoseFirstResponder: Ember.K,

  acceptsFirstResponder: true,
  previousResponder: null,
  nextResponder: null,
  responderGroup: 'default',

  isFirstResponder: Ember.computed(function() {
    return get(Ember.responder, 'firstResponder') === this;
  }).property('Ember.responder.firstResponder').cacheable(),

  isFocusedBinding: Ember.Binding.oneWay('isFirstResponder'),
  classNameBindings: ['isFocused'],

  becomeFirstResponder: function() {
    Ember.run.once(Ember.responder, 'becomeFirstResponder', this);
  },

  resignFirstResponder: function() {
    Ember.run.once(Ember.responder, 'resignFirstResponder', this);
  },

  goToNextResponder: function() {
    Ember.run.once(Ember.responder, 'goToNextResponder', this);
  },

  goToPreviousResponder: function() {
    Ember.run.once(Ember.responder, 'goToNextResponder', this, true);
  },

  didInsertElement: function() {
    this.responderGroupDidChange();
    this._super();
  },

  destroyElement: function() {
    this.responderGroupWillChange();
    this._super();
  },

  responderGroupWillChange: Ember.beforeObserver(function() {
    Ember.responder.removeViewFromRespondersChain(this);
  }, 'responderGroup'),

  responderGroupDidChange: Ember.observer(function() {
    Ember.responder.addViewToRespondersChain(this);
  }, 'responderGroup'),

  focus: function() {
    Ember.run.schedule('render', this, function() {
      var element = get(this, 'element');
      if (element && element.focus) { element.focus(); }
    });
  },

  blur: function() {
    Ember.run.schedule('render', this, function() {
      var element = get(this, 'element');
      if (element && element.blur) { element.blur(); }
    });
  },

  keyDown: function(evt) {
    if (typeof this._super === 'function') { this._super(evt); }
    if (get(this, 'isFirstResponder') && evt.which === 9) {
      if (evt.which === 16) { this._shift = true; }
      evt.preventDefault();
      if (this._shift) {
        this.goToPreviousResponder();
      } else {
        this.goToNextResponder();
      }
    }
  },

  keyUp: function(evt) {
    if (typeof this._super === 'function') { this._super(evt); }
    if (get(this, 'isFirstResponder')) {
      if (evt.which === 16) { this._shift = false; }
      this.interpretKeyEvents(evt);
    }
  },

  focusIn: function(evt) {
    if (typeof this._super === 'function') { this._super(evt); }
    this.becomeFirstResponder();
  },

  focusOut: function(evt) {
    if (typeof this._super === 'function') { this._super(evt); }
    this.resignFirstResponder();
  },

  interpretKeyEvents: function(evt) {
    var map = Ember.ResponderSupport.KEY_EVENTS,
        method = map[evt.which];

    if (this._elementValueDidChange) { this._elementValueDidChange(); }

    if (typeof this[method] === 'function') { return this[method](evt); }
  },

  cancel: function() {
    this.resignFirstResponder();
  }

  /**
    insertNewline
    cancel
    space
    left
    up
    right
    down
  **/
});

Ember.ResponderSupport.KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel',
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down'
};
