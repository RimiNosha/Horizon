<template>
  <div
    style="
      height: 100%;
      display: flex;
      flex-direction: column;
      flex: 1;
      margin: 0 5px;
      position: relative;
    "
    id="conversation"
  >
    <div style="display: flex" v-if="isPrivate(conversation)" class="header">
      <img
        :src="characterImage"
        style="
          height: 60px;
          width: 60px;
          margin-right: 10px;
          object-fit: contain;
        "
        v-if="settings.showAvatars"
      />
      <div
        style="
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          user-select: text;
        "
      >
        <div>
          <user
            :character="conversation.character"
            :match="true"
            :isMarkerShown="shouldShowMarker"
          ></user>
          <a href="#" @click.prevent="showLogs()" class="btn btn-link">
            <span class="fa fa-file-alt"></span>
            <span class="btn-text">{{ l('logs.title') }}</span>
          </a>
          <a href="#" @click.prevent="showSettings()" class="btn btn-link">
            <span class="fa fa-cog"></span>
            <span class="btn-text">{{ l('conversationSettings.title') }}</span>
          </a>
          <a
            href="#"
            @click.prevent="reportDialog.report()"
            class="btn btn-link"
          >
            <span class="fa fa-exclamation-triangle"></span
            ><span class="btn-text">{{ l('chat.report') }}</span></a
          >

          <a href="#" @click.prevent="showAds()" class="btn btn-link">
            <span class="fa fa-ad"></span
            ><span class="btn-text">{{ l('conversation.ads') }}</span>
          </a>

          <a href="#" @click.prevent="showChannels()" class="btn btn-link">
            <span class="fa fa-tv"></span
            ><span class="btn-text">{{ l('conversation.channels') }}</span>
          </a>

          <a href="#" @click.prevent="showMemo()" class="btn btn-link">
            <span class="fas fa-edit"></span
            ><span class="btn-text">{{ l('conversation.memo') }}</span>
          </a>
        </div>
        <div
          style="
            overflow: auto;
            overflow-x: hidden;
            max-height: 50px;
            user-select: text;
          "
        >
          {{ l('status.' + conversation.character.status) }}
          <span v-show="conversation.character.statusText">
            – <bbcode :text="conversation.character.statusText"></bbcode
          ></span>
          <div v-show="userMemo">
            <b>{{ l('conversation.memoLabel') }}</b> {{ userMemo }}
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="isChannel(conversation)" class="header">
      <div style="display: flex; align-items: center">
        <div style="flex: 1">
          <span
            class="fa-fw"
            :class="isOfficialChannel ? 'fa fa-star' : 'fas fa-hashtag'"
            :title="l(`channel.${isOfficialChannel ? 'official' : 'private'}`)"
            style="vertical-align: sub"
          ></span>
          <h5 style="margin: 0; display: inline; vertical-align: middle">
            {{ conversation.name }}
          </h5>
          <a
            href="#"
            @click.prevent="descriptionExpanded = !descriptionExpanded"
            class="btn btn-link"
          >
            <span
              class="fa"
              :class="{
                'fa-chevron-down': !descriptionExpanded,
                'fa-chevron-up': descriptionExpanded
              }"
            ></span>
            <span class="btn-text">{{ l('channel.description') }}</span>
          </a>
          <a
            href="#"
            @click.prevent="showManage()"
            v-show="isChannelMod"
            class="btn btn-link"
          >
            <span class="fa fa-edit"></span>
            <span class="btn-text">{{ l('manageChannel.open') }}</span>
          </a>
          <a href="#" @click.prevent="showLogs()" class="btn btn-link">
            <span class="fa fa-file-alt"></span>
            <span class="btn-text">{{ l('logs.title') }}</span>
          </a>
          <a href="#" @click.prevent="showSettings()" class="btn btn-link">
            <span class="fa fa-cog"></span>
            <span class="btn-text">{{ l('conversationSettings.title') }}</span>
          </a>
          <a
            href="#"
            @click.prevent="reportDialog.report()"
            class="btn btn-link"
          >
            <span class="fa fa-exclamation-triangle"></span
            ><span class="btn-text">{{ l('chat.report') }}</span></a
          >
        </div>

        <div class="btn-toolbar">
          <div class="btn-group" v-show="isAdsCapable">
            <button
              class="btn btn-secondary"
              :class="{ active: showAdGrid }"
              :title="l('conversation.adsGrid')"
              type="button"
              @click="toggleAdGrid"
            >
              <i class="fas fa-th-large"></i>
              <span class="btn-text">{{ l('conversation.adsGrid') }}</span>
            </button>
          </div>

          <dropdown
            :keep-open="false"
            :title="l('action.view')"
            :icon-class="viewModeIconClass"
            wrap-class="btn-group views"
            link-class="btn btn-secondary dropdown-toggle"
            v-show="conversation.channel.mode == 'both'"
          >
            <button
              v-for="mode in modes"
              class="dropdown-item"
              :class="{ selected: conversation.mode == mode }"
              type="button"
              @click="setMode(mode)"
            >
              {{ l('channel.mode.' + mode) }}
            </button>
          </dropdown>

          <dropdown
            :keep-open="false"
            wrap-class="btn-group ads"
            link-style=""
            link-class="btn btn-secondary dropdown-toggle dropdown-toggle-split"
            v-show="
              conversation.channel.mode == 'both' ||
              conversation.channel.mode == 'ads'
            "
          >
            <button
              class="dropdown-item"
              type="button"
              @click="toggleAutoPostAds()"
            >
              {{
                l(
                  conversation.adManager.isActive()
                    ? 'admgr.pausePosting'
                    : 'admgr.startPosting'
                )
              }}
            </button>
            <button
              class="dropdown-item"
              type="button"
              @click="showAdSettings()"
            >
              {{ l('admgr.editChannelAds') }}
            </button>
            <div class="dropdown-divider"></div>
            <button
              class="dropdown-item"
              :class="{ selected: showNonMatchingAds }"
              type="button"
              @click="toggleNonMatchingAds()"
            >
              {{ l('admgr.showIncompatibleAds') }}
            </button>

            <template v-slot:split>
              <a class="btn btn-secondary" @click="toggleAutoPostAds()">
                <i
                  :class="{
                    fas: true,
                    'fa-pause': conversation.adManager.isActive(),
                    'fa-play': !conversation.adManager.isActive()
                  }"
                ></i>
                {{
                  l(
                    conversation.adManager.isActive()
                      ? 'admgr.pauseAds'
                      : 'admgr.startAds'
                  )
                }}
              </a>
            </template>
          </dropdown>
        </div>
      </div>
      <div
        style="
          z-index: 5;
          position: absolute;
          left: 0;
          right: 0;
          max-height: 60%;
          overflow: auto;
        "
        :style="{ display: descriptionExpanded ? 'block' : 'none' }"
        class="bg-solid-text border-bottom hidden-scrollbar"
      >
        <bbcode :text="conversation.channel.description"></bbcode>
      </div>
    </div>
    <div v-else class="header" style="display: flex; align-items: center">
      <i
        style="margin-right: 5px; vertical-align: sub"
        class="fa-solid fa-fw fa-house"
      ></i>
      <h5 style="margin: 0; display: inline; vertical-align: middle">
        {{ l('chat.consoleTab') }}
      </h5>

      <a href="#" @click.prevent="showLogs()" class="btn btn-link">
        <span class="fa fa-file-alt"></span>
        <span class="btn-text">{{ l('logs.title') }}</span>
      </a>
    </div>
    <div class="search input-group" v-show="showSearch">
      <span class="input-group-text">
        <span class="fas fa-search"></span>
      </span>
      <input
        v-model="searchInput"
        @keydown.esc="hideSearch()"
        @keypress="lastSearchInput = Date.now()"
        :placeholder="l('chat.search')"
        ref="searchField"
        class="form-control"
      />
      <button
        class="btn btn-outline-secondary"
        :class="{ active: highlightEnabled }"
        :title="l('chat.toggleHighlight')"
        @click="highlightEnabled = !highlightEnabled"
      >
        <span class="fas fa-highlighter"></span>
      </button>
      <a class="btn btn-light" @click="hideSearch">
        <i class="fas fa-times"></i>
      </a>
    </div>
    <div class="auto-ads" v-show="isAutopostingAds()">
      <h4>{{ l('admgr.activeHeader') }}</h4>
      <div class="update">{{ adAutoPostUpdate }}</div>

      <div v-show="adAutoPostNextAd" class="next">
        <h5>
          {{ l('admgr.comingNext') }}
          <a @click="skipAd()"><i class="adAction fas fa-arrow-right" /></a>
        </h5>
        <div>
          {{ adAutoPostNextAd ? adAutoPostNextAd.substr(0, 100) : '' }}...
        </div>
      </div>

      <a
        class="btn btn-sm btn-outline-primary renew-autoposts"
        @click="renewAutoPosting()"
        v-if="!adsRequireSetup"
        >{{ l('admgr.renew') }}</a
      >
      <a
        class="btn btn-sm btn-outline-primary renew-autoposts"
        @click="showAdSettings()"
        v-if="adsRequireSetup"
        >{{ l('admgr.setup') }}</a
      >
    </div>
    <div
      class="border-top messages hidden-scrollbar"
      :class="getMessageWrapperClasses()"
      ref="messages"
      @scroll="onMessagesScroll"
      style="flex: 1; overflow: auto; margin-top: 2px"
      v-show="!showAdGrid"
    >
      <template v-for="(message, i) in messages">
        <message-view
          :message="message"
          :channel="isChannel(conversation) ? conversation.channel : undefined"
          :key="message.id"
          :classes="message == conversation.lastRead ? 'last-read' : ''"
          :highlight="highlightEnabled ? search : ''"
          :previous="messages[i - 1]"
        >
        </message-view>
        <span
          v-if="hasSFC(message) && message.sfc.action === 'report'"
          :key="'r' + message.id"
        >
          <a
            :href="
              'https://www.f-list.net/fchat/getLog.php?log=' + message.sfc.logid
            "
            v-if="message.sfc.logid"
            target="_blank"
            >{{ l('events.report.viewLog') }}</a
          >
          <span v-else>{{ l('events.report.noLog') }}</span>
          <span v-show="!message.sfc.confirmed">
            |
            <a
              href="#"
              @click.prevent="
                message.sfc.action === 'report' && acceptReport(message.sfc)
              "
              >{{ l('events.report.confirm') }}</a
            >
          </span>
        </span>
      </template>
    </div>
    <!-- ^ Characters that posted ads here; their ads are previewed on hover -->
    <div
      class="border-top ads-grid hidden-scrollbar"
      style="flex: 1; overflow: auto; margin-top: 2px"
      v-show="showAdGrid && isChannel(conversation)"
    >
      <template v-if="adPosters.length">
        <div class="ads-grid-inner">
          <!-- ^ data-character lets ChatView's global contextmenu handler open
               the right-click user menu for the tile. -->
          <div
            class="ads-grid-tile"
            :class="[
              poster.scoreClass ? `score-${poster.scoreClass}` : '',
              {
                hovered: hoveredPoster && hoveredPoster.name === poster.name,
                pinned: pinnedPoster && pinnedPoster.name === poster.name
              }
            ]"
            :data-character="poster.name"
            data-bs-touch="false"
            v-for="poster in adPosters"
            :key="poster.name"
            @mouseenter="showPosterHover(poster)"
            @click.stop="togglePin(poster)"
          >
            <img
              class="ads-grid-avatar"
              :src="avatarFor(poster.name)"
              loading="lazy"
            />
            <!-- ^ The tile name is a real UserView, so gender/offline/custom
                 colors, badges, markers and the match chip match the chat. -->
            <user
              class="ads-grid-name"
              :character="poster.character"
              :channel="conversation.channel"
              :match="false"
              :isMarkerShown="shouldShowMarker"
            ></user>
          </div>
        </div>
      </template>
      <template v-else>
        <i>{{ l('conversation.adsGrid.empty') }}</i>
      </template>
    </div>
    <!-- ^ Docked at the bottom of the conversation; hovering previews, clicking
         pins. Click the pin to unpin. Must be v-if: the body binds activePoster,
         which is undefined when nothing is hovered/pinned. -->
    <div class="border-top ads-grid-ad" v-if="showAdGrid && activePoster">
      <div class="ads-grid-ad-meta">
        <span class="ads-grid-ad-name">{{ activePoster.name }}</span>
        <span class="message-time">{{ formatTime(activePoster.time) }}</span>
        <span
          class="ads-grid-ad-pin"
          :class="{ pinned: pinnedPoster }"
          :title="
            pinnedPoster
              ? l('conversation.adsGrid.unpin')
              : l('conversation.adsGrid.pin')
          "
          @click="togglePin(activePoster)"
        ></span>
      </div>
      <div class="ads-grid-ad-body">
        <bbcode :text="activePoster.text"></bbcode>
      </div>
    </div>
    <bbcode-editor
      v-show="!showAdGrid"
      v-model="conversation.enteredText"
      @keydown="onKeyDown"
      :extras="extraButtons"
      @input="keepScroll"
      :classes="
        'form-control chat-text-box' +
        (isChannel(conversation) && conversation.isSendingAds
          ? ' ads-text-box'
          : '')
      "
      :hasToolbar="settings.bbCodeBar"
      ref="textBox"
      style="margin-top: 5px"
      :maxlength="
        isChannel(conversation) || isPrivate(conversation)
          ? conversation.maxMessageLength
          : undefined
      "
      :characterName="ownName"
      :type="'big'"
    >
      <span
        v-if="isPrivate(conversation) && conversation.typingStatus !== 'clear'"
        class="chat-info-text"
      >
        <user
          :character="conversation.character"
          :match="false"
          :bookmark="false"
          :isMarkerShown="shouldShowMarker"
        ></user
        >&nbsp;{{
          l('chat.typing.' + conversation.typingStatus, {
            character: ''
          }).trim()
        }}
      </span>
      <div v-show="conversation.infoText" class="chat-info-text">
        <span
          class="fa fa-times"
          style="cursor: pointer"
          @click.stop="conversation.infoText = ''"
        ></span>
        <bbcode-ui
          :text="conversation.infoText"
          style="flex: 1; margin-left: 5px"
        ></bbcode-ui>
      </div>
      <div v-show="conversation.errorText" class="chat-info-text">
        <span
          class="fa fa-times"
          style="cursor: pointer"
          @click.stop="conversation.errorText = ''"
        ></span>
        <bbcode-ui
          :text="conversation.errorText"
          class="redText"
          style="flex: 1; margin-left: 5px"
        ></bbcode-ui>
      </div>
      <div class="bbcode-editor-controls">
        <div
          class="char-count"
          v-if="isChannel(conversation) || isPrivate(conversation)"
          style="margin-right: 5px"
        >
          {{ getByteLength(conversation.enteredText) }} /
          {{ conversation.maxMessageLength }}
        </div>
        <ul
          class="nav nav-pills send-ads-switcher"
          v-if="isChannel(conversation)"
          style="position: relative; z-index: 10; margin-right: 5px"
        >
          <li
            class="nav-item"
            v-show="
              conversation.channel.mode === 'both' ||
              conversation.channel.mode === 'chat'
            "
          >
            <a
              href="#"
              :class="{
                active: !conversation.isSendingAds,
                disabled:
                  conversation.channel.mode != 'both' ||
                  conversation.adManager.isActive()
              }"
              class="nav-link"
              @click.prevent="setSendingAds(false)"
              >{{ l('channel.mode.chat') }}</a
            >
          </li>
          <li
            class="nav-item"
            v-show="
              conversation.channel.mode === 'both' ||
              conversation.channel.mode === 'ads'
            "
          >
            <a
              href="#"
              :class="{
                active: conversation.isSendingAds,
                disabled:
                  conversation.channel.mode != 'both' ||
                  conversation.adManager.isActive()
              }"
              class="nav-link"
              @click.prevent="setSendingAds(true)"
              >{{ adsMode }}</a
            >
          </li>
        </ul>
        <div
          class="btn btn-sm btn-primary"
          v-show="!settings.enterSend"
          @click="sendButton"
        >
          {{ l('chat.send') }}
        </div>
      </div>
    </bbcode-editor>
    <command-help ref="helpDialog"></command-help>
    <settings ref="settingsDialog" :conversation="conversation"></settings>
    <adSettings
      ref="adSettingsDialog"
      :conversation="conversation"
    ></adSettings>
    <logs ref="logsDialog" :conversation="conversation"></logs>
    <manage-channel
      ref="manageDialog"
      v-if="isChannel(conversation)"
      :channel="conversation.channel"
    ></manage-channel>
    <ad-view
      ref="adViewer"
      v-if="isPrivate(conversation) && conversation.character"
      :character="conversation.character"
    ></ad-view>
    <channel-list
      ref="channelList"
      v-if="isPrivate(conversation)"
      :character="conversation.character"
    ></channel-list>
    <modal
      :action="l('user.memo.action')"
      ref="userMemoEditor"
      @submit="updateMemo"
      dialogClass="w-100"
    >
      <div style="float: right; text-align: right">
        {{ getByteLength(editorMemo) }} / 1000
      </div>
      <textarea
        class="form-control"
        v-model="editorMemo"
        maxlength="1000"
      ></textarea>
    </modal>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import { EditorButton, EditorSelection } from '../bbcode/editor';
  import { BBCodeView } from '../bbcode/view';
  import Modal, { isShowing as anyDialogsShown } from '../components/Modal.vue';
  import { Keys } from '../keys';
  import CharacterAdView from './character/CharacterAdView.vue';
  import { Editor } from './bbcode';
  import CommandHelp from './CommandHelp.vue';
  import {
    characterImage,
    errorToString,
    formatTime,
    getByteLength,
    getKey
  } from './common';
  import ConversationSettings from './ConversationSettings.vue';
  import { Score } from '../learn/matcher';
  import { kinkMatchWeights, Scoring } from '../learn/matcher-types';
  import { GridPoster } from '../learn/ad-grid-cache';
  import { isFilteredByChatGender } from '../learn/filter/smart-filter';
  import { hasActiveSmartFilters } from '../learn/filter/types';
  import ConversationAdSettings from './ads/ConversationAdSettings.vue';
  import core from './core';
  import {
    Channel,
    channelModes,
    Character,
    Conversation,
    Settings
  } from './interfaces';
  import l from './localize';
  import Logs from './Logs.vue';
  import ManageChannel from './ManageChannel.vue';
  import MessageView from './message_view';
  import { isCommand } from './slash_commands';
  import UserView from './UserView.vue';
  import CharacterChannelList from './character/CharacterChannelList.vue';
  import * as _ from 'lodash';
  import Dropdown from '../components/Dropdown.vue';
  import { EventBus } from './preview/event-bus';
  import { MemoManager } from './character/memo';
  import { CharacterMemo } from '../site/character_page/interfaces';
  import { UserInterfaceBBCodeParser } from '../bbcode/user-interface';

  const UIBbcodeParser = new UserInterfaceBBCodeParser();

  // ^ Mirrors UserView.getMatchScoreTitle, keyed on the score class string.
  function getMatchScoreLabel(scoreClass: string): string {
    switch (scoreClass) {
      case 'perfect':
        return 'Perfect';
      case 'match':
        return 'Great';
      case 'weak-match':
        return 'Good';
      case 'weak-mismatch':
        return 'Maybe';
      case 'mismatch':
        return 'No';
      default:
        return '';
    }
  }

  export default Vue.extend({
    components: {
      user: UserView,
      'bbcode-editor': Editor,
      'manage-channel': ManageChannel,
      settings: ConversationSettings,
      logs: Logs,
      'message-view': MessageView,
      bbcode: BBCodeView(core.bbCodeParser),
      'bbcode-ui': BBCodeView(UIBbcodeParser),
      'command-help': CommandHelp,
      'ad-view': CharacterAdView,
      'channel-list': CharacterChannelList,
      dropdown: Dropdown,
      adSettings: ConversationAdSettings,
      modal: Modal
    },
    props: {
      reportDialog: { required: true as const }
    },
    data() {
      return {
        modes: channelModes,
        descriptionExpanded: false,
        l: l,
        formatTime: formatTime,
        // ^ The computed `characterImage` returns the current conversation's
        // avatar string, so grid tiles use this function alias instead.
        avatarFor: characterImage,
        // ^ Swaps the message list for a grid of characters that posted ads
        showAdGrid: false,
        hoveredPoster: undefined as
          | { name: string; text: string; time: Date }
          | undefined,
        // ^ Clicking a tile pins its ad to the bottom card until unpinned
        pinnedPoster: undefined as
          | { name: string; text: string; time: Date }
          | undefined,
        extraButtons: [] as EditorButton[],
        getByteLength: getByteLength,
        tabOptions: undefined as string[] | undefined,
        tabOptionsIndex: undefined as any as number,
        tabOptionSelection: undefined as any as EditorSelection,
        showSearch: false,
        searchInput: '',
        search: '',
        highlightEnabled: true,
        lastSearchInput: 0,
        messageCount: 0,
        searchTimer: 0,
        messageView: undefined as any as HTMLElement,
        resizeHandler: undefined as any as EventListener,
        keydownHandler: undefined as any as EventListener,
        keypressHandler: undefined as any as EventListener,
        scrolledDown: true,
        scrolledUp: false,
        ignoreScroll: false,
        adCountdown: 0,
        adsMode: l('channel.mode.ads'),
        autoPostingUpdater: 0,
        adAutoPostUpdate: null as string | null,
        adAutoPostNextAd: null as string | null,
        adsRequireSetup: false,
        isChannel: Conversation.isChannel,
        isPrivate: Conversation.isPrivate,
        showNonMatchingAds: true,
        userMemo: '',
        editorMemo: '',
        memoManager: undefined as MemoManager | undefined,
        ownName: undefined as Character | undefined,
        configUpdateHook: undefined as any,
        memoUpdateHook: undefined as any,
        // ^ Bumped when a profile's score arrives so the ad grid recomputes.
        scoreTick: 0,
        scoreTickHook: undefined as any,
        channelAdHook: undefined as any,
        // ^ Posters we have already asked the cache to fetch, so a re-render
        // does not re-queue the same profile every score tick
        requestedPosters: new Set<string>()
      };
    },
    computed: {
      conversation(): Conversation {
        return core.conversations.selectedConversation;
      },
      isAdsCapable(): boolean {
        return (
          this.isChannel(this.conversation) &&
          (this.conversation.channel.mode === 'both' ||
            this.conversation.channel.mode === 'ads')
        );
      },

      // ^ One tile per character that posted an ad in this channel, oldest ad
      // first so newer posters append to the end. Posters the smart filters hide
      // are dropped by the ad grid cache itself. The tile carries the matcher
      // verdict kept in that cache plus the character, so rendering never reads
      // the profile cache and never pulls a full profile back into memory.
      adPosters(): ReadonlyArray<{
        name: string;
        text: string;
        time: Date;
        character: Character;
        scoreClass: string;
        scoreLabel: string;
      }> {
        if (!this.isChannel(this.conversation)) return [];

        // ^ Touch the tick so the grid recomputes as scores arrive and as new
        // ads are recorded (older than six hours are pruned by the cache)
        void this.scoreTick;

        const posters = core.cache.adGridCache.getPosters(
          this.conversation.channel.id
        );

        const showScores = core.state.settings.risingAdScore;
        return posters
          .filter(
            poster =>
              !core.isHidden(poster.name) && !this.isPosterFiltered(poster)
          )
          .map(poster => {
            const scoreClass = showScores
              ? this.getPosterScoreClass(poster)
              : '';
            return {
              name: poster.name,
              text: poster.text,
              time: poster.time,
              character: this.posterCharacter(poster.name),
              scoreClass,
              scoreLabel: scoreClass ? getMatchScoreLabel(scoreClass) : ''
            };
          });
      },
      activePoster(): { name: string; text: string; time: Date } | undefined {
        return this.pinnedPoster ?? this.hoveredPoster;
      },
      shouldShowMarker(): boolean {
        return core.state.settings.horizonShowGenderMarker;
      },
      messages(): ReadonlyArray<
        Conversation.Message | Conversation.SFCMessage
      > {
        let messages: ReadonlyArray<
          Conversation.Message | Conversation.SFCMessage
        > = this.conversation.messages;
        if (
          core.state.hiddenUsers.length > 0 &&
          this.isChannel(this.conversation)
        )
          messages = messages.filter(
            x =>
              x.type !== Conversation.Message.Type.Ad ||
              !core.isHidden(x.sender.name)
          );
        if (this.search === '') return messages;
        const filter = new RegExp(this.search.replace(/[^\w]/gi, '\\$&'), 'i');
        return messages.filter(
          x =>
            filter.test(x.text) ||
            filter.test(_.get(x, 'sender.name', '') as string)
        );
      },
      characterImage(): string {
        return characterImage(this.conversation.name);
      },
      settings(): Settings {
        return core.state.settings;
      },
      isConsoleTab(): boolean {
        return this.conversation === core.conversations.consoleTab;
      },
      isChannelMod(): boolean {
        if (core.characters.ownCharacter.isChatOp) return true;
        const conv = <Conversation.ChannelConversation>this.conversation;
        const member = conv.channel.members[core.connection.character];
        return member !== undefined && member.rank > Channel.Rank.Member;
      },
      isOfficialChannel(): boolean {
        if (!this.isChannel(this.conversation)) return false;
        const conv = <Conversation.ChannelConversation>this.conversation;
        return conv.channel.id.substr(0, 4) !== 'adh-';
      },
      viewModeIconClass(): string {
        const baseClasses = ['fas'];

        if (this.conversation.mode === 'chat') {
          baseClasses.push('fa-comments');
        } else if (this.conversation.mode === 'ads') {
          baseClasses.push('fa-ad');
        } else if (this.conversation.mode === 'both') {
          baseClasses.push('fa-asterisk');
        }

        return baseClasses.join(' ');
      }
    },
    watch: {
      conversation: {
        handler: 'conversationChanged'
      },
      isAdsCapable(newValue: boolean): void {
        if (!newValue) this.showAdGrid = false;
      },
      'conversation.messages': {
        handler: 'messageAdded'
      },
      'conversation.errorText'(newValue: string, oldValue: string): void {
        if (oldValue.length === 0 && newValue.length > 0) this.keepScroll();
      },
      'conversation.infoText'(newValue: string, oldValue: string): void {
        if (oldValue.length === 0 && newValue.length > 0) this.keepScroll();
      },
      'conversation.typingStatus'(str: string, oldValue: string): void {
        if (oldValue === 'clear') this.keepScroll();
      }
    },
    async beforeMount(): Promise<void> {
      this.updateOwnName();

      this.showNonMatchingAds =
        !(await core.settingsStore.get('hideNonMatchingAds'));
    },
    mounted(): void {
      this.updateOwnName();

      this.extraButtons = [
        {
          titleKey: 'editor.help',
          tag: '?',
          icon: 'fa-question',
          handler: () => (<CommandHelp>this.$refs['helpDialog']).show()
        }
      ];
      window.addEventListener(
        'resize',
        (this.resizeHandler = () => this.keepScroll())
      );
      window.addEventListener(
        'keypress',
        (this.keypressHandler = () => {
          if (this.shouldRedirectTyping())
            (<Editor>this.$refs['textBox']).focus();
        })
      );
      window.addEventListener(
        'keydown',
        (this.keydownHandler = ((e: KeyboardEvent) => {
          if (
            getKey(e) === Keys.KeyF &&
            (e.ctrlKey || e.metaKey) &&
            !e.shiftKey &&
            !e.altKey
          ) {
            this.showSearch = true;
            this.$nextTick(() =>
              (<HTMLElement>this.$refs['searchField']).focus()
            );
          } else if (
            (getKey(e) === Keys.Enter || getKey(e) === Keys.Backspace) &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey &&
            this.shouldRedirectTyping()
          ) {
            // ^ keypress never fires for Backspace, and for Enter it comes
            // too late to be treated as a send; redirect both here.
            (<Editor>this.$refs['textBox']).focus();
            if (getKey(e) === Keys.Enter) void this.onKeyDown(e);
          }
        }) as EventListener)
      );

      this.searchTimer = window.setInterval(() => {
        // ignore whitespace-only search
        const committed =
          this.searchInput.trim().length === 0 ? '' : this.searchInput;
        if (
          Date.now() - this.lastSearchInput > 500 &&
          this.search !== committed
        )
          this.search = committed;
      }, 500);
      this.messageView = <HTMLElement>this.$refs['messages'];
      this.$watch('conversation.nextAd', (value: number) => {
        const setAdCountdown = () => {
          const diff =
            ((<Conversation.ChannelConversation>this.conversation).nextAd -
              Date.now()) /
            1000;
          if (diff <= 0) {
            if (this.adCountdown !== 0) window.clearInterval(this.adCountdown);
            this.adCountdown = 0;
            this.adsMode = l('channel.mode.ads');
          } else
            this.adsMode = l('channel.mode.ads.countdown', {
              minutes: Math.floor(diff / 60),
              seconds: Math.floor(diff % 60)
            });
        };
        if (Date.now() < value && this.adCountdown === 0)
          this.adCountdown = window.setInterval(setAdCountdown, 1000);
        setAdCountdown();
      });

      this.$watch(
        () => this.conversation.adManager.isActive(),
        () => this.refreshAutoPostingTimer()
      );
      this.refreshAutoPostingTimer();

      this.configUpdateHook = () => {
        this.updateOwnName();
        // ^ Color settings (offline/gender colors) changed: refresh tile names
        if (this.showAdGrid) this.scoreTick++;
      };
      EventBus.$on('configuration-update', this.configUpdateHook);

      this.memoUpdateHook = (e: any) => this.refreshMemo(e);
      EventBus.$on('character-memo', this.memoUpdateHook);

      // ^ Recompute tile scores as profiles finish matching while the grid is open
      this.scoreTickHook = () => {
        if (this.showAdGrid) this.scoreTick++;
      };
      EventBus.$on('character-score', this.scoreTickHook);

      // ^ Refresh the grid as new ads are recorded in the current channel
      this.channelAdHook = (e: any) => {
        if (!this.showAdGrid) return;
        const channelId = _.get(e.channel, 'channel.id');
        if (channelId === _.get(this.conversation, 'channel.id'))
          this.scoreTick++;
      };
      EventBus.$on('channel-ad', this.channelAdHook);
    },
    destroyed(): void {
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('keydown', this.keydownHandler);
      window.removeEventListener('keypress', this.keypressHandler);
      clearInterval(this.searchTimer);
      clearInterval(this.autoPostingUpdater);
      clearInterval(this.adCountdown);

      EventBus.$off('configuration-update', this.configUpdateHook);
      EventBus.$off('character-memo', this.memoUpdateHook);
      EventBus.$off('character-score', this.scoreTickHook);
      EventBus.$off('channel-ad', this.channelAdHook);
    },
    methods: {
      hideSearch(): void {
        this.showSearch = false;
        this.searchInput = '';
      },

      updateOwnName(): void {
        this.ownName = core.state.settings.risingShowPortraitNearInput
          ? core.characters.ownCharacter
          : undefined;
      },

      async sendButton(): Promise<void> {
        return this.conversation.send();
      },

      async conversationChanged(): Promise<void> {
        this.updateOwnName();

        this.showAdGrid = false;
        this.hoveredPoster = undefined;
        this.pinnedPoster = undefined;

        if (!anyDialogsShown) (<Editor>this.$refs['textBox']).focus();
        this.$nextTick(() =>
          setTimeout(
            () => (this.messageView.scrollTop = this.messageView.scrollHeight)
          )
        );
        this.scrolledDown = true;
        this.refreshAutoPostingTimer();
        this.userMemo = '';

        if (this.isPrivate(this.conversation)) {
          const c = await core.cache.profileCache.get(this.conversation.name);
          this.userMemo = c?.character?.memo?.memo || '';
        }
        const editor = <Editor>this.$refs['textBox'];

        if (editor !== null && editor.preview) {
          editor.togglePreview();
        }
      },

      messageAdded(newValue: Conversation.Message[]): void {
        this.keepScroll();
        if (!this.scrolledDown && newValue.length === this.messageCount)
          this.messageView.scrollTop -=
            this.messageView.firstElementChild!.clientHeight;
        this.messageCount = newValue.length;
      },

      keepScroll(): void {
        if (this.scrolledDown) {
          this.ignoreScroll = true;
          this.$nextTick(() =>
            setTimeout(() => {
              this.ignoreScroll = true;
              this.messageView.scrollTop = this.messageView.scrollHeight;
            }, 0)
          );
        }
      },

      onMessagesScroll(): void {
        if (this.ignoreScroll) {
          this.ignoreScroll = false;
          return;
        }
        if (this.messageView.scrollTop < 20) {
          if (!this.scrolledUp) {
            const firstMessage = this.messageView.firstElementChild;
            if (this.conversation.loadMore() && firstMessage !== null) {
              this.messageView.style.overflow = 'hidden';
              this.$nextTick(() => {
                this.messageView.scrollTop = (<HTMLElement>(
                  firstMessage
                )).offsetTop;
                this.messageView.style.overflow = 'auto';
              });
            }
          }
          this.scrolledUp = true;
        } else this.scrolledUp = false;
        this.scrolledDown =
          this.messageView.scrollTop + this.messageView.offsetHeight >=
          this.messageView.scrollHeight - 15;
      },

      shouldRedirectTyping(): boolean {
        // ^ Typing shortcuts are meaningless while the ad grid is open
        if (this.showAdGrid) return false;

        const selection = document.getSelection();
        return (
          (selection === null || selection.isCollapsed) &&
          !anyDialogsShown &&
          (document.activeElement === document.body ||
            document.activeElement === null ||
            document.activeElement.tagName === 'A')
        );
      },

      async onKeyDown(e: KeyboardEvent): Promise<void> {
        const editor = <Editor>this.$refs['textBox'];
        if (getKey(e) === Keys.Tab) {
          if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          if (this.conversation.enteredText.length === 0 || this.isConsoleTab)
            return;
          if (this.tabOptions === undefined) {
            const selection = editor.getSelection();
            if (selection.text.length === 0) {
              const match = /\b[\w]+$/.exec(
                editor.text.substring(0, selection.end)
              );
              if (match === null) return;
              selection.start = match.index < 0 ? 0 : match.index;
              selection.text = editor.text.substring(
                selection.start,
                selection.end
              );
              if (selection.text.length === 0) return;
            }
            const search = new RegExp(
              `^${selection.text.replace(/[^\w]/gi, '\\$&')}`,
              'i'
            );
            const c = <Conversation.PrivateConversation>this.conversation;
            let options: ReadonlyArray<{ character: Character }>;
            options = Conversation.isChannel(this.conversation)
              ? this.conversation.channel.sortedMembers
              : [
                  { character: c.character },
                  { character: core.characters.ownCharacter }
                ];
            this.tabOptions = options
              .filter(x => search.test(x.character.name))
              .map(x => x.character.name);
            this.tabOptionsIndex = 0;
            this.tabOptionSelection = selection;
          }
          if (this.tabOptions.length > 0) {
            const selection = editor.getSelection();
            if (selection.end !== this.tabOptionSelection.end) return;
            if (this.tabOptionsIndex >= this.tabOptions.length)
              this.tabOptionsIndex = 0;
            const name = this.tabOptions[this.tabOptionsIndex];
            const userName = isCommand(this.conversation.enteredText)
              ? name
              : `[user]${name}[/user]`;
            this.tabOptionSelection.end =
              this.tabOptionSelection.start + userName.length;
            this.conversation.enteredText =
              this.conversation.enteredText.substr(
                0,
                this.tabOptionSelection.start
              ) +
              userName +
              this.conversation.enteredText.substr(selection.end);
            ++this.tabOptionsIndex;
          }
        } else {
          if (this.tabOptions !== undefined) this.tabOptions = undefined;
          if (
            getKey(e) === Keys.ArrowUp &&
            this.conversation.enteredText.length === 0 &&
            !e.shiftKey &&
            !e.altKey &&
            !e.ctrlKey &&
            !e.metaKey
          )
            this.conversation.loadLastSent();
          else if (getKey(e) === Keys.Enter) {
            if (e.shiftKey === this.settings.enterSend) return;
            e.preventDefault();
            await this.conversation.send();
          }
        }
      },

      setMode(mode: Channel.Mode): void {
        const conv = <Conversation.ChannelConversation>this.conversation;
        if (conv.channel.mode === 'both') conv.mode = mode;
      },

      async toggleNonMatchingAds(): Promise<void> {
        this.showNonMatchingAds = !this.showNonMatchingAds;

        await core.settingsStore.set(
          'hideNonMatchingAds',
          !this.showNonMatchingAds
        );
      },

      /* tslint:disable */
      getMessageWrapperClasses(): any {
        const filter = core.state.settings.risingFilter;
        const classes: any = {};
        const layout = core.state.settings.chatLayoutMode || 'classic';

        if (this.isPrivate(this.conversation)) {
          classes['filter-channel-messages'] = filter.hidePrivateMessages;
          classes['layout-' + layout] = true;
          return classes;
        }

        if (!this.isChannel(this.conversation)) {
          return {};
        }

        const conv = <Conversation.ChannelConversation>this.conversation;

        classes['messages-' + conv.mode] = true;
        classes['hide-non-matching'] = !this.showNonMatchingAds;

        classes['filter-ads'] = filter.hideAds;
        classes['filter-channel-messages'] =
          conv.channel.owner !== ''
            ? filter.hidePrivateChannelMessages
            : filter.hidePublicChannelMessages;

        // Apply chat layout mode class (classic/modern)
        classes['layout-' + layout] = true;
        return classes;
      },

      acceptReport(sfc: { callid: number }): void {
        core.connection.send('SFC', { action: 'confirm', callid: sfc.callid });
      },

      setSendingAds(is: boolean): void {
        const conv = <Conversation.ChannelConversation>this.conversation;
        if (conv.channel.mode === 'both') {
          conv.isSendingAds = is;
          (<Editor>this.$refs['textBox']).focus();
        }
      },

      showLogs(): void {
        (<Logs>this.$refs['logsDialog']).show();
      },

      showSettings(): void {
        (<ConversationSettings>this.$refs['settingsDialog']).show();
      },

      showAdSettings(): void {
        (<ConversationAdSettings>this.$refs['adSettingsDialog']).show();
      },

      showManage(): void {
        (<ManageChannel>this.$refs['manageDialog']).show();
      },

      // ^ Mirrors UserList.getFilteredMembers: hide posters the smart filters
      // match. Uses the grid's own copy of the verdict when it has one, so a
      // filter change hides posters without reaching into the profile cache;
      // otherwise fall back to the chat-gender verdict.
      isPosterFiltered(poster: GridPoster): boolean {
        const filters = core.state.settings.risingFilter;
        if (!filters.hideChannelMembers || !hasActiveSmartFilters(filters)) {
          return false;
        }

        if (poster.profile?.isFiltered === true) return true;

        const character = core.characters.get(poster.name);
        return (
          character !== undefined && isFilteredByChatGender(character, filters)
        );
      },

      // ^ The tile's UserView resolves colors, badges and the match chip itself;
      // it only needs the character object, which the state creates on demand.
      posterCharacter(name: string): Character {
        return core.characters.get(name);
      },

      // ^ Scores a poster from the ad grid cache's own copy of the matcher
      // verdict, mirroring UserView.getStatusClasses. Falls back to fetching the
      // profile only when the verdict is missing, so a grid with more posters
      // than the profile cache can hold in memory stays fully scored.
      getPosterScoreClass(poster: GridPoster): string {
        if (poster.profile) {
          if (
            poster.profile.searchScore >= kinkMatchWeights.perfectThreshold &&
            poster.profile.matchScore === Scoring.MATCH
          ) {
            return 'perfect';
          }
          return Score.getClasses(poster.profile.matchScore);
        }

        const channel = this.isChannel(this.conversation)
          ? this.conversation.channel
          : undefined;

        // ^ Request the profile once; re-renders must not re-queue it. Low
        // priority: opening the grid asks for every poster at once, and the
        // disk cache checks must not compete with interactive store requests.
        if (!this.requestedPosters.has(poster.name)) {
          this.requestedPosters.add(poster.name);
          void core.cache.addProfile(poster.name, channel?.id, 'low');
        }

        return '';
      },

      toggleAdGrid(): void {
        this.showAdGrid = !this.showAdGrid;
        this.hoveredPoster = undefined;
        this.pinnedPoster = undefined;
        // ^ Force a score recompute whenever the grid is opened
        this.scoreTick++;

        if (this.showAdGrid) return;

        // ^ Returning to chat: refocus the editor and pin the scroll to bottom
        if (!anyDialogsShown) (<Editor>this.$refs['textBox']).focus();
        this.$nextTick(() =>
          setTimeout(
            () => (this.messageView.scrollTop = this.messageView.scrollHeight)
          )
        );
        this.scrolledDown = true;
      },

      showPosterHover(poster: {
        name: string;
        text: string;
        time: Date;
      }): void {
        // ^ A pinned ad stays; don't let hovering swap the bottom card.
        if (this.pinnedPoster) return;

        this.hoveredPoster = poster;
      },

      clearPosterHover(poster: { name: string }): void {
        // ^ A pinned ad stays open after the pointer leaves the tile.
        if (this.pinnedPoster) return;

        // ^ Ignore a stale leave when the pointer already moved to another tile
        if (this.hoveredPoster?.name === poster.name) {
          this.hoveredPoster = undefined;
        }
      },

      togglePin(poster: { name: string; text: string; time: Date }): void {
        if (this.pinnedPoster?.name === poster.name) {
          this.pinnedPoster = undefined;
        } else {
          this.pinnedPoster = poster;
          this.hoveredPoster = undefined;
        }
      },

      showAds(): void {
        (<CharacterAdView>this.$refs['adViewer']).show();
      },

      showChannels(): void {
        (<CharacterChannelList>this.$refs['channelList']).show();
      },

      isAutopostingAds(): boolean {
        return this.conversation.adManager.isActive();
      },

      skipAd(): void {
        this.conversation.adManager.skipAd();
        this.updateAutoPostingState();
      },

      stopAutoPostAds(): void {
        this.conversation.adManager.stop();
      },

      renewAutoPosting(): void {
        this.conversation.adManager.renew();

        this.refreshAutoPostingTimer();
      },

      toggleAutoPostAds(): void {
        if (this.isAutopostingAds()) this.stopAutoPostAds();
        else this.conversation.adManager.start();

        this.refreshAutoPostingTimer();
      },

      updateAutoPostingState() {
        const adManager = this.conversation.adManager;

        this.adAutoPostNextAd = adManager.getNextAd() || null;

        if (this.adAutoPostNextAd) {
          const diff =
            ((adManager.getNextPostDue() || new Date()).getTime() -
              Date.now()) /
            1000;
          const expDiff =
            ((adManager.getExpireDue() || new Date()).getTime() - Date.now()) /
            1000;

          const diffMins = Math.floor(diff / 60);
          const diffSecs = Math.floor(diff % 60);
          const expDiffMins = Math.floor(expDiff / 60);
          const expDiffSecs = Math.floor(expDiff % 60);

          this.adAutoPostUpdate = l(
            adManager.getNextPostDue() && !adManager.getFirstPost()
              ? 'admgr.postingBeginsExpires'
              : 'admgr.nextPostDueExpires',
            {
              postMinutes: diffMins,
              postSeconds: diffSecs,
              expireMinutes: expDiffMins,
              expireSeconds: expDiffSecs
            }
          );

          this.adsRequireSetup = false;
        } else {
          this.adAutoPostNextAd = null;

          this.adAutoPostUpdate = l('admgr.noAds');
          this.adsRequireSetup = true;
        }
      },

      refreshAutoPostingTimer(): void {
        if (this.autoPostingUpdater)
          window.clearInterval(this.autoPostingUpdater);

        if (!this.isAutopostingAds()) {
          this.adAutoPostUpdate = null;
          this.adAutoPostNextAd = null;
          return;
        }

        this.autoPostingUpdater = window.setInterval(
          () => this.updateAutoPostingState(),
          1000
        );
        this.updateAutoPostingState();
      },

      hasSFC(
        message: Conversation.Message
      ): message is Conversation.SFCMessage {
        // noinspection TypeScriptValidateTypes
        return (<Partial<Conversation.SFCMessage>>message).sfc !== undefined;
      },

      updateMemo(): void {
        this.memoManager
          ?.set(this.editorMemo)
          .catch((e: object) => core.notifications.alert(errorToString(e)));
        this.userMemo = this.editorMemo;
      },

      refreshMemo(event: { character: string; memo: CharacterMemo }): void {
        this.userMemo = event.memo.memo;
      },

      async showMemo(): Promise<void> {
        if (this.isPrivate(this.conversation)) {
          const c = this.conversation.character;

          this.editorMemo = '';

          (<Modal>this.$refs['userMemoEditor']).show();

          try {
            this.memoManager = new MemoManager(c.name);
            await this.memoManager.load();

            this.userMemo = this.memoManager.get().memo;
            this.editorMemo = this.userMemo;
          } catch (e) {
            core.notifications.alert(errorToString(e));
          }
        }
      }
    }
  });
</script>

<style lang="scss">
  @import '~bootstrap/scss/functions';
  @import '~bootstrap/scss/variables';
  @import '~bootstrap/scss/mixins/breakpoints';

  #conversation {
    .header {
      @media (min-width: breakpoint-min(md)) {
        margin-right: 32px;
      }
      .btn {
        padding: 2px 5px;
      }
    }

    .btn-toolbar:not(.bbcode-toolbar) {
      .btn-group {
        margin-right: 0.3rem;

        &:last-child {
          margin-right: 0;
        }

        a.btn {
          padding-left: 0.5rem;
          padding-right: 0.5rem;
          // color: #cbcbe5;

          i {
            margin-right: 0.4rem;
            font-size: 90%;
          }
        }

        button::before {
          display: inline-block;
          width: 1.3rem;
          height: 1rem;
          content: '';
          margin-left: -1.3rem;
          margin-right: 0.1rem;
          padding-left: 0.3rem;
          font-weight: bold;
        }

        button.selected::before {
          content: '✓';
        }

        &.views {
          button.selected::before {
            content: '•';
          }
        }
      }
    }

    .send-ads-switcher a {
      padding: 3px 10px;
    }

    .auto-ads {
      background-color: rgb(220, 113, 31);
      padding-left: 10px;
      padding-right: 10px;
      padding-top: 5px;
      padding-bottom: 5px;
      margin: 0;
      position: relative;
      margin-top: 5px;

      .adAction {
        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        &:active {
          color: rgba(255, 255, 255, 0.6);
        }
      }

      .renew-autoposts {
        display: block;
        float: right;
        /* margin-top: auto; */
        /* margin-bottom: auto; */
        position: absolute;
        /* bottom: 1px; */
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        border-color: rgba(255, 255, 255, 0.5);
        color: rgba(255, 255, 255, 0.9);

        &:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }

        &:active {
          background-color: rgba(255, 255, 255, 0.6);
        }
      }

      h4 {
        font-size: 1.1rem;
        margin: 0;
        line-height: 100%;
      }

      .update {
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
        width: 75%;
      }

      .next {
        margin-top: 0.5rem;
        color: rgba(255, 255, 255, 0.4);
        font-size: 11px;

        h5 {
          font-size: 0.8rem;
          margin: 0;
          line-height: 100%;
        }
      }
    }

    @media (max-width: breakpoint-max(sm)) {
      .mode-switcher a {
        padding: 5px 8px;
      }
    }
  }

  .chat-info-text {
    display: flex;
    align-items: center;
    flex: 1 auto;
    width: 100%;
    @media (max-width: breakpoint-max(xs)) {
      flex-basis: 100%;
    }
  }

  .message-time,
  .message .message-time,
  .ad-viewer .message-time {
    background-color: var(--messageTimeBgColor);
    color: var(--messageTimeFgColor);
    border-radius: 3px;
    padding-left: 3px;
    padding-right: 3px;
    padding-bottom: 2px;
    padding-top: 1px;
    margin-right: 3px;
    font-size: 80%;
  }

  #conversation .ads-grid {
    .ads-grid-inner {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 6px 2px;
    }

    .ads-grid-tile {
      width: 96px;
      height: 104px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 6px;
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      transition:
        box-shadow 0.08s,
        transform 0.08s;
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }

      &:hover,
      &.hovered {
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        transform: translateY(-2px);
      }

      &.pinned {
        outline: solid 2px var(--bs-warning);
        outline-offset: -2px;

        &::after {
          content: '\f08d';
          font-family: 'Font Awesome 6 Free';
          font-weight: 900;
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 11px;
          color: var(--bs-warning);
        }
      }
    }

    .ads-grid-avatar {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }

    .ads-grid-name {
      font-size: 12px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      // ^ The tile name is a UserView, so .user-view already supplies the
      // gender/custom color; only the tile's layout and truncation live here.
      display: block;
    }

    .ads-grid-score {
      font-size: 11px;
      border-radius: 3px;
      padding: 1px 4px;
      line-height: 1;
    }

    // ^ Follow the matcher colors so the grid reads like the chat itself.
    .ads-grid-tile.score-perfect {
      border-left: solid 3px var(--scorePerfectMatchBg);
      background-color: var(--scoreFadedPerfectMatchBg);

      .ads-grid-score {
        background-color: var(--scorePerfectMatchBg);
        color: var(--scorePerfectMatchFg);
      }
    }

    .ads-grid-tile.score-match {
      border-left: solid 3px var(--scoreStandoutMatchBorderColor);
      background-color: var(--scoreMatchBgFaint);

      .ads-grid-score {
        background-color: var(--scoreMatchBg);
        color: var(--scoreMatchFg);
      }
    }

    .ads-grid-tile.score-weak-match {
      border-left: solid 3px var(--scoreStandoutWeakMatchBorderColor);
      background-color: var(--scoreWeakMatchBgFaint);

      .ads-grid-score {
        background-color: var(--scoreWeakMatchBg);
        color: var(--scoreWeakMatchFg);
      }
    }

    .ads-grid-tile.score-neutral {
      border-left: solid 3px var(--scoreStandoutNeutralBorderColor);
    }

    .ads-grid-tile.score-weak-mismatch {
      border-left: solid 3px var(--scoreStandoutWeakMismatchBorderColor);
      background-color: var(--scoreWeakMismatchBgFaint);

      .ads-grid-score {
        background-color: var(--scoreWeakMismatchBg);
        color: var(--scoreWeakMismatchFg);
      }
    }

    .ads-grid-tile.score-mismatch {
      border-left: solid 3px var(--scoreStandoutMismatchBorderColor);
      background-color: var(--scoreMismatchBgFaint);

      .ads-grid-score {
        background-color: var(--scoreMismatchBg);
        color: var(--scoreMismatchFg);
      }
    }
  }

  #conversation .ads-grid-ad {
    flex-shrink: 0;
    margin-top: 2px;
    padding: 6px 10px;
    background: var(--input-bg);
    color: var(--input-color);

    .ads-grid-ad-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .ads-grid-ad-name {
      font-weight: 600;
    }

    .ads-grid-ad-pin {
      cursor: pointer;
      margin-left: auto;

      &::before {
        content: '\f08d';
        font-family: 'Font Awesome 6 Free';
        font-weight: 400;
        opacity: 0.5;
      }

      &.pinned::before {
        font-weight: 900;
        opacity: 1;
        color: var(--bs-warning);
      }
    }

    .ads-grid-ad-body {
      max-height: 160px;
      overflow: auto;
      font-size: 13px;
    }
  }

  .ad-viewer {
    display: block;

    h3 {
      font-size: 12pt;

      .message-time {
        padding-bottom: 1px;
      }
    }

    .border-bottom {
      margin-bottom: 15px;
      border-width: 1px;
    }
  }

  .user-view {
    .user-rank {
      font-size: 80%;
      margin-right: 2px;
    }

    .user-dev {
      font-size: 80%;
      margin-right: 2px;
    }

    .user-contributor {
      font-size: 80%;
      margin-right: 2px;
    }

    // eventually we should make these one rule.
    .user-translator {
      font-size: 80%;
      margin-right: 2px;
    }

    .user-staff {
      font-size: 80%;
      margin-right: 2px;
    }

    .user-supporter {
      font-size: 80%;
      margin-right: 2px;
    }

    .user-sponsor {
      font-size: 80%;
      margin-right: 2px;
    }

    .user-gender {
      &.gender-male,
      &.gender-female,
      &.gender-transgender,
      &.gender-none,
      &.gender-shemale,
      &.gender-male-herm,
      &.gender-herm,
      &.gender-cuntboy {
        text-shadow: none;
      }
    }
    .match-found {
      margin-left: 3px;
      padding-left: 2px;
      padding-right: 2px;
      border-radius: 3px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 75%;
      text-align: center;
      display: inline-block;
      text-transform: uppercase;
      line-height: 100%;
      padding-top: 2px;
      padding-bottom: 2px;
      text-shadow: none;

      &.perfect {
        background-color: var(--scorePerfectMatchBg);
        border: 1px solid var(--scorePerfectMatchFg);
        box-shadow: 0 0 5px 0 rgba(255, 255, 255, 0.5);

        &::before {
          content: '✨';
          padding-right: 3px;
        }
      }

      &.match {
        background-color: var(--scoreMatchBg);
        border: solid 1px var(--scoreMatchFg);
      }

      &.weak-match {
        background-color: var(--scoreWeakMatchBg);
        border: 1px solid var(--scoreWeakMatchFg);
      }

      &.weak-mismatch {
        background-color: var(--scoreWeakMismatchBg);
        border: 1px solid var(--scoreWeakMismatchFg);
      }

      &.mismatch {
        background-color: var(--scoreMismatchBg);
        border: 1px solid var(--scoreMismatchFg);
      }
    }
  }

  .messages.hide-non-matching .message.message-score {
    &.mismatch {
      display: none;
    }
  }

  .messages.filter-ads {
    .message.filter-match.message-ad {
      display: none;
    }
  }

  .messages.filter-channel-messages {
    .message.filter-match.message-message,
    .message.filter-match.message-action {
      display: none;
    }
  }

  .message {
    .message-pre {
      font-size: 75%;
      padding-right: 2px;
      padding-left: 1px;
      opacity: 0.9;
      display: inline-block;
    }

    &.message-event {
      font-size: 85%;
      background-color: rgba(255, 255, 255, 0.1);
    }

    &.message-score {
      padding-left: 5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      &.match {
        border-left: 12px solid var(--scoreStandoutMatchBorderColor);
        background-color: var(--scoreStandoutMatchBgColor);
        // border-left: 12px solid #027b02;
        // background-color: rgba(1, 115, 1, 0.45);
      }

      &.weak-match {
        border-left: 12px solid var(--scoreStandoutWeakMatchBorderColor);
        background-color: var(--scoreStandoutWeakMatchBgColor);

        .bbcode {
          filter: grayscale(0.25);
          opacity: 0.77;
        }
      }

      &.neutral {
        border-left: 12px solid var(--scoreStandoutNeutralBorderColor);

        .bbcode {
          filter: grayscale(0.5);
        }

        .bbcode,
        .user-view,
        .message-time,
        .message-pre,
        .message-post {
          opacity: 0.6;
        }
      }

      &.weak-mismatch {
        border-left: 12px solid var(--scoreStandoutWeakMismatchBorderColor);
        background-color: var(--scoreStandoutWeakMismatchBgColor);

        .bbcode {
          filter: grayscale(0.7);
        }

        .bbcode,
        .user-view,
        .message-time,
        .message-pre,
        .message-post {
          opacity: 0.55;
        }
      }

      &.mismatch {
        border-left: 12px solid var(--scoreStandoutMismatchBorderColor);

        .bbcode {
          filter: grayscale(0.8);
        }

        .bbcode,
        .user-view,
        .message-time,
        .message-pre,
        .message-post {
          opacity: 0.3;
        }
      }
    }
  }

  .user-avatar {
    max-height: 1.2em;
    min-height: 1.2em;
    margin-right: 2px !important;
    margin-top: 0;
    min-width: 1.2em;
    max-width: 1.2em;
  }
</style>
