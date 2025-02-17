import { shallowMount } from "@vue/test-utils";
import { axe, toHaveNoViolations } from "jest-axe";

import App from "../App";
import * as configFns from "../../lib/configuration";
import { TITLE_EMOJI_REGEX } from "../../utils/constants.js";

// Mock dashboard data
const mockDashboardData = {
  dashboard: {
    bgColor: "#808900",
    bgImageRepeat: "true",
    bgImageUrl: "",
    blockSize: [250, 200],
    title: "\u2700 IoT Dashboard",
    tiles: [
      {
        buttonText: "stop",
        deviceId: "AZ3166",
        deviceMethod: "stop",
        id: "2471d5ab-0d73-42a3-ba4f-f694574feb6b",
        position: [54, 466],
        size: [0.8, 0.7],
        title: "MXChip sending",
        type: "button"
      },
      {
        id: "84de1d0d-d1ae-4daa-9540-179e9dd4155c",
        position: [50, 730],
        size: [1, 1],
        title: "",
        type: "sticker",
        url: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg"
      }
    ],
    editMode: "unlocked"
  },
  deviceList: ["AZ3166", "Tessel2", "Jenn"]
};

// Shallow mount App component as reusable function for tests
function shallowMountComponent(props = {}) {
  return shallowMount(App, {
    propsData: {
      ...props
    },

    data() {
      return {
        ...mockDashboardData
      };
    }
  });
}

expect.extend(toHaveNoViolations);

describe("App", () => {
  beforeEach(() => {
    jest.restoreAllMocks();

    jest
      .spyOn(configFns, "getDashboard")
      .mockImplementation(() => Promise.resolve(mockDashboardData.dashboard));
    jest
      .spyOn(configFns, "getDeviceList")
      .mockImplementation(() => Promise.resolve([]));
    jest.spyOn(configFns, "saveDashboard").mockImplementation(() =>
      Promise.resolve({
        data: {
          message: "Dashboard saved."
        }
      })
    );
  });

  test("Component can be mounted", () => {
    const wrapper = shallowMount(App);

    expect(wrapper.html()).toBeTruthy();
  });

  test("Child components can be mounted", async () => {
    const wrapper = shallowMount(App);

    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "DashboardSettings" }).exists()).toBe(
      true
    );
    expect(wrapper.findComponent({ name: "BaseCard" }).exists()).toBe(true);
  });

  test("Default data is clean", () => {
    const wrapper = shallowMount(App);

    expect(wrapper.vm.dashboard.blockSize).toEqual([]);
    expect(wrapper.vm.dashboard.tiles).toEqual([]);
    expect(wrapper.vm.messages).toEqual([]);
    expect(wrapper.vm.deviceList).toEqual([]);
    expect(wrapper.vm.simulating).toEqual(SIMULATING);
  });

  test("Title style is based on the computed property headingStyle", async () => {
    const wrapper = shallowMount(App);

    await wrapper.vm.$nextTick();

    expect(wrapper.vm.headingStyle).toEqual({ color: "#000" });

    // Test whether `headingStyle` fallback color is used
    wrapper.setData({
      dashboard: {
        bgColor: "hsl(270, 50%, 80%)",
        bgImageUrl: "http://test",
        bgImageRepeat: false
      }
    });
    expect(wrapper.vm.headingStyle).toEqual({ color: "#000" });
  });

  test("DashboardSettings are shown based on computed property showSettings", async () => {
    const wrapper = shallowMount(App);

    await wrapper.vm.$nextTick();

    expect(wrapper.vm.showSettings).toEqual(true);
    expect(wrapper.findComponent({ name: "DashboardSettings" }).exists()).toBe(
      true
    );

    wrapper.vm.dashboard.editMode = "locked";

    await wrapper.vm.$nextTick();

    expect(wrapper.vm.showSettings).toEqual(false);
    expect(wrapper.findComponent({ name: "DashboardSettings" }).exists()).toBe(
      false
    );
  });

  test("compute the appTitle with or without an emoji using the TITLE_EMOJI_REGEX constant", () => {
    const wrapper = shallowMountComponent();

    const titleEmojified = TITLE_EMOJI_REGEX.exec(
      mockDashboardData.dashboard.title
    );

    expect(wrapper.vm.dashboardTitle).toBe(mockDashboardData.dashboard.title);
    expect(wrapper.vm.dashboardTitleEmojified).toEqual(titleEmojified);
  });

  test("onSaveSettings method", async () => {
    const wrapper = shallowMount(App);

    await wrapper.vm.$nextTick();

    wrapper.vm.dashboard.editMode = "unlocked";

    await wrapper.vm.$nextTick();

    wrapper
      .findComponent({ name: "DashboardSettings" })
      .vm.$emit("save-settings", {
        bgColor: "#fff",
        bgImageRepeat: true,
        bgImageUrl: "",
        title: "\u2700 IoT Dashboard"
      });

    expect(wrapper.vm.dashboard).toEqual(
      expect.objectContaining({
        bgColor: expect.any(String),
        bgImageRepeat: expect.any(Boolean),
        bgImageUrl: expect.any(String),
        blockSize: expect.any(Array),
        editMode: expect.any(String),
        tiles: expect.any(Array),
        title: expect.any(String)
      })
    );
    expect(configFns.saveDashboard).toHaveBeenCalled();
  });

  test("onTileChange method", () => {
    const wrapper = shallowMountComponent();

    expect(wrapper.vm.dashboard).toEqual(mockDashboardData.dashboard);

    mockDashboardData.dashboard.tiles[0].buttonText = "stop it";

    wrapper.vm.onTileChange(event => {
      event.id = mockDashboardData.dashboard.tiles[0].id;
    });

    expect(wrapper.vm.dashboard.tiles[0]).toEqual({
      buttonText: "stop it",
      deviceId: "AZ3166",
      deviceMethod: "stop",
      id: "2471d5ab-0d73-42a3-ba4f-f694574feb6b",
      position: [54, 466],
      size: [0.8, 0.7],
      title: "MXChip sending",
      type: "button"
    });

    expect(wrapper.vm.dashboard.tiles.length).toBe(2);
  });

  test("onTileDelete method", async () => {
    const wrapper = shallowMount(App);
    await wrapper.vm.$nextTick();

    const tileId = mockDashboardData.dashboard.tiles[0].id;

    wrapper.vm.onTileDelete(tileId);

    expect(
      wrapper.findComponent({ name: "BaseCard" }).vm.$emit("tile-delete")
    ).toBeTruthy();

    expect(wrapper.vm.dashboard.tiles.length).toBe(1);
  });

  test("onTileCreate method", async () => {
    const wrapper = shallowMount(App);
    await wrapper.vm.$nextTick();

    wrapper
      .findComponent({ name: "DashboardSettings" })
      .vm.$emit("tile-create", {
        deviceId: "",
        id: "2ece272b-a403-46d6-b136-e35906fe1d0d",
        lineColor: "#FF6384",
        position: [0, 0],
        property: "",
        size: [2, 1.5],
        title: "Line Chart",
        type: "line-chart"
      });

    expect(configFns.saveDashboard).toHaveBeenCalled();
    expect(wrapper.vm.dashboard.tiles.length).toBe(3);
  });

  test("onDeviceListReceived method", () => {
    const wrapper = shallowMountComponent();

    let deviceList;
    wrapper.vm.onDeviceListReceived(deviceList);

    expect(deviceList).toEqual(wrapper.vm.deviceList);

    // TODO: test socket.on callback function
  });

  test("the getDashboard and getDeviceList are invoked in the created lifecycle hook", async () => {
    const wrapper = shallowMount(App);
    await wrapper.vm.$nextTick();

    expect(configFns.getDashboard).toHaveBeenCalled();
    expect(configFns.getDeviceList).toHaveBeenCalled();
  });

  test("Axe doesn’t find any violations", async () => {
    const wrapper = shallowMount(App);
    await wrapper.vm.$nextTick();

    const html = wrapper.html();

    expect(await axe(html)).toHaveNoViolations();
  });
});
