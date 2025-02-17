import { shallowMount } from "@vue/test-utils";
import { axe, toHaveNoViolations } from "jest-axe";

import BaseCard from "../BaseCard";

/**
 * Helper function for injecting a test element into the DOM
 * This element can then be used as the mount point when using the [`attachTo`][1] option.
 *
 * [1]: https://vue-test-utils.vuejs.org/api/options.html#attachto
 *
 * @returns {string} a CSS selector that should be used as the value for the `attachTo` option
 */
function injectTestDiv() {
  const id = "root";
  const div = document.createElement("div");
  div.id = id;
  document.body.appendChild(div);
  return `#${id}`;
}

function shallowMountComponent() {
  return shallowMount(BaseCard, {
    attachTo: injectTestDiv(),

    propsData: {
      tile: {
        callType: "method",
        deviceId: "AZ3166",
        deviceMethod: "stop",
        id: "ac57912f-1a04-4cc2-a587-1bc116e8cc54",
        lineColor: "#FF6384",
        position: [200, 246],
        property: "",
        size: [2, 1.5],
        title: "Line Chart",
        type: "line-chart"
      },
      blockWidth: 200,
      blockHeight: 250,
      deviceList: ["AZ3166", "Tessel2", "Jenn"],
      messages: [
        {
          deviceId: "BU2802",
          enqueuedTime: "2019-06-03T11:45:10.125Z",
          humidity: 32.800208338,
          temperature: 45.13494407
        },
        {
          deviceId: "AZ3166",
          enqueuedTime: "2019-06-03T11:33:10.125Z",
          humidity: 7.053375767532866,
          temperature: 31.599309710235097
        }
      ],
      editMode: "unlocked"
    },
    stubs: {
      "a11y-dialog": true
    }
  });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

expect.extend(toHaveNoViolations);

describe("BaseCard", () => {
  test("component can mount", () => {
    const wrapper = shallowMountComponent();

    expect(wrapper.html()).toBeTruthy();
  });

  test("the initial state of the default data", () => {
    const { vm } = shallowMountComponent();

    expect(vm.editingCard).toEqual(false);
    expect(vm.isDraggingCard).toEqual(false);
    expect(vm.cardHasBeenMoved).toEqual(false);
    expect(vm.x).toEqual(vm.tile.position[0]);
    expect(vm.y).toEqual(vm.tile.position[1]);
    expect(vm.offsetX).toEqual(0);
    expect(vm.offsetY).toEqual(0);
    expect(vm.dialog).toEqual(null);
  });

  test("the computed values of the top and left computed method", () => {
    const { vm } = shallowMountComponent();

    expect(vm.left).toEqual("200px");
    expect(vm.top).toEqual("246px");

    vm.x = 210;
    vm.y = 262;

    expect(vm.left).toEqual("210px");
    expect(vm.top).toEqual("262px");
  });

  test("the computed value of style", () => {
    const wrapper = shallowMountComponent();
    const inlineStyles = {
      top: wrapper.vm.top,
      left: wrapper.vm.left,
      "--card-tile-width": `${wrapper.vm.blockWidth *
        wrapper.vm.tile.size[0]}px`,
      minHeight: `${wrapper.vm.blockHeight * wrapper.vm.tile.size[1]}px`
    };

    expect(wrapper.vm.style).toEqual(inlineStyles);

    const card = wrapper.find(".card");

    expect(card.attributes().style).toBe(
      `top: ${inlineStyles.top}; left: ${inlineStyles.left}; min-height: ${inlineStyles.minHeight}; --card-tile-width: ${inlineStyles["--card-tile-width"]};`
    );
  });

  test("the computed value of cardComponentName", async () => {
    const wrapper = shallowMountComponent();

    expect(wrapper.vm.cardComponentName).toEqual("line-chart-card");

    await wrapper.setProps({
      tile: {
        deviceId: "AZ3166",
        deviceMethod: "stop",
        id: "ac57912f-1a04-4cc2-a587-1bc116e8cc54",
        lineColor: "#FF6384",
        position: [200, 246],
        property: "",
        size: [2, 1.5],
        title: "Line Chart",
        type: "Button",
        callType: "method"
      }
    });

    expect(wrapper.vm.cardComponentName).toEqual("button-card");
  });

  test("the computed value of showControlers", async () => {
    const wrapper = shallowMountComponent();

    expect(wrapper.vm.showCardActions).toEqual(true);

    await wrapper.setProps({
      editMode: "locked"
    });

    expect(wrapper.vm.showCardActions).toEqual(false);
  });

  test("the isDraggingCard watcher", async () => {
    const spy = jest.spyOn(BaseCard.watch, "isDraggingCard");
    const wrapper = shallowMountComponent();
    const event = {
      target: {
        tagName: "H2"
      }
    };

    wrapper.vm.editingCard = true;

    wrapper.vm.startDraggingCard(event);

    expect(spy).not.toHaveBeenCalled();

    wrapper.vm.editingCard = false;

    wrapper.vm.startDraggingCard(event);

    await wrapper.vm.$nextTick();
    expect(spy).toHaveBeenCalled();
  });

  test("the assigndialogRef method", () => {
    const { vm } = shallowMountComponent();

    vm.assignDialogRef(dialog => {
      expect(vm.dialog).toEqual(dialog);
    });
  });

  test("the openCardRemoveModal method", () => {
    const spy = jest.spyOn(BaseCard.methods, "openCardRemoveModal");
    const wrapper = shallowMountComponent();

    const button = wrapper.find("[data-test='card-remove-button']");

    button.trigger("click");

    expect(spy).toHaveBeenCalled();

    wrapper.vm.dialog = true;
  });

  test("tileDelete method", () => {
    const wrapper = shallowMountComponent();

    const button = wrapper.find("[data-test='card-remove-confirm-button']");

    button.trigger("click");

    expect(wrapper.vm.$emit("tile-delete")).toBeTruthy();
  });

  test("the onSaveSettings method", async () => {
    const spy = jest.spyOn(BaseCard.methods, "onSaveSettings");
    const wrapper = shallowMountComponent();

    expect(wrapper.vm.editingCard).toEqual(false);

    const button = wrapper.find("[data-test='card-edit-button']");

    await button.trigger("click");

    expect(wrapper.vm.editingCard).toEqual(true);

    wrapper.findComponent({ name: "CardForm" }).vm.$emit("save-settings", {
      bgColor: "#fff",
      bgImageRepeat: true,
      bgImageUrl: "",
      title: "\u2700 IoT Dashboard"
    });

    expect(wrapper.vm.$emit("save-settings")).toBeTruthy();
    expect(spy).toHaveBeenCalled();
  });

  test("the updateCardPosition method", () => {
    const wrapper = shallowMountComponent();

    expect(wrapper.vm.x).toEqual(200);
    expect(wrapper.vm.y).toEqual(246);

    wrapper.vm.updateCardPosition({
      x: 253,
      y: 310
    });

    expect(wrapper.vm.x).toEqual(253);
    expect(wrapper.vm.y).toEqual(310);
  });

  test("if the updateCardPosition method is called in the dragCard method", () => {
    const spy = jest.spyOn(BaseCard.methods, "updateCardPosition");
    const { vm } = shallowMountComponent();

    const event = {
      preventDefault: jest.fn()
    };

    vm.dragCard(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(vm.cardHasBeenMoved).toEqual(false);
    expect(spy).not.toHaveBeenCalled();

    vm.isDraggingCard = true;
    vm.editingCard = false;

    vm.dragCard(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(vm.cardHasBeenMoved).toEqual(true);
    expect(spy).toHaveBeenCalled();
  });

  test("check and make sure the emitCardPosition method is called when stopDraggingCard or moveCardWithArrows are invoked", () => {
    const spy = jest.spyOn(BaseCard.methods, "emitCardPosition");
    const { vm } = shallowMountComponent();
    const event = {
      preventDefault: jest.fn(),
      key: "ArrowUp"
    };

    vm.editingCard = false;
    vm.$el.focus();

    vm.moveCardWithArrows(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();

    vm.stopDraggingCard();
    vm.cardHasBeenMoved = true;

    expect(vm.isDraggingCard).toEqual(false);
    expect(spy).toHaveBeenCalled();
  });

  test("the startDraggingCardWithMouse method", () => {
    const spyWithMouse = jest.spyOn(
      BaseCard.methods,
      "startDraggingCardWithMouse"
    );
    const spy = jest.spyOn(BaseCard.methods, "startDraggingCard");
    const wrapper = shallowMountComponent();
    const event = {
      clientX: 615,
      clientY: 423,
      buttons: 1,
      target: {
        tagName: "div"
      }
    };
    const card = wrapper.find(".card");

    card.trigger("mousedown.stop.passive");

    expect(spyWithMouse).toHaveBeenCalled();

    wrapper.vm.startDraggingCardWithMouse(event);

    expect(spy).toHaveBeenCalled();
  });

  test("the startDraggingCardWithTouch method", () => {
    const spyWithMouse = jest.spyOn(
      BaseCard.methods,
      "startDraggingCardWithTouch"
    );
    const spy = jest.spyOn(BaseCard.methods, "startDraggingCard");
    const wrapper = shallowMountComponent();
    const event = {
      touches: [
        {
          clientX: 615,
          clientY: 423
        }
      ],
      buttons: 1,
      target: {
        tagName: "div"
      }
    };

    // We are invoking the method rather than simulating a touch event due to it requring a touch
    // event to be passed as an arguement. Jest does not allow you to pass an event as an argument
    // when triggering events.
    wrapper.vm.startDraggingCardWithTouch(event);

    expect(spyWithMouse).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  test("the moveCardWithArrows method", () => {
    const spyWithArrows = jest.spyOn(BaseCard.methods, "moveCardWithArrows");
    const spyUpdateCardPosition = jest.spyOn(
      BaseCard.methods,
      "updateCardPosition"
    );
    const spyEmitCardPosition = jest.spyOn(
      BaseCard.methods,
      "emitCardPosition"
    );
    const wrapper = shallowMountComponent();
    const event = {
      preventDefault: jest.fn(),
      key: "ArrowDown"
    };
    const card = wrapper.find(".card");

    wrapper.vm.editingCard = false;
    wrapper.vm.$el.focus();

    card.trigger("keydown");

    expect(spyWithArrows).toHaveBeenCalled();

    wrapper.vm.moveCardWithArrows(event);

    expect(spyUpdateCardPosition).toHaveBeenCalled();
    expect(spyEmitCardPosition).toHaveBeenCalled();
  });

  test("the methods in the registered custom event listeners", () => {
    const spyDragCard = jest.spyOn(BaseCard.methods, "dragCard");
    const { vm } = shallowMountComponent();
    const clickEvent = {
      clientX: 615,
      clientY: 423
    };
    const touchEvent = {
      touches: [
        {
          clientX: 615,
          clientY: 423
        }
      ]
    };

    vm.dragCardWithMouse(clickEvent);

    expect(spyDragCard).toHaveBeenCalled();

    vm.dragCardWithTouch(touchEvent);

    expect(spyDragCard).toHaveBeenCalled();
  });

  test("that the isDraggingCard watcher is called when the startDraggingCard, dragCard, or stopDraggingCard methods are invoked", () => {
    const spy = jest.spyOn(BaseCard.watch, "isDraggingCard");
    const wrapper = shallowMountComponent();
    const event = {
      preventDefault: jest.fn(),
      target: {
        tagName: "H2"
      }
    };

    wrapper.vm.startDraggingCard(event);

    expect(spy).toHaveBeenCalled();

    wrapper.vm.dragCard(event);

    expect(spy).toHaveBeenCalled();

    wrapper.vm.stopDraggingCard();

    expect(spy).toHaveBeenCalled();
  });

  test("Axe doesn’t find any violations", async () => {
    const wrapper = shallowMountComponent();
    const html = wrapper.html();

    expect(await axe(html)).toHaveNoViolations();
  });
});
