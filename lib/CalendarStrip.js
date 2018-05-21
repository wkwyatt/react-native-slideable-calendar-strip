import React, { Component, PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  FlatList,
  // Platform,
  Dimensions,
  // StyleSheet,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import Weeks from './Weeks';
import {
  // getDay,
  format,
  addDays,
  subDays,
  // isToday,
  eachDay,
  isFuture,
  isSameDay,
  endOfWeek,
  getISOWeek,
  startOfWeek,
  differenceInDays,
} from 'date-fns';
import ChineseLunar from 'chinese-lunar';
import ChineseLocale from 'date-fns/locale/zh_cn';

const width = Dimensions.get('window').width;
const ITEM_LENGTH = width / 7;
const _today = new Date();
const _year = _today.getFullYear();
const _month = _today.getMonth();
const _day = _today.getDate();
const TODAY = new Date(_year, _month, _day); // FORMAT: Wed May 16 2018 00:00:00 GMT+0800 (CST)

class DateItem extends PureComponent {
  render() {
    const { item, highlight, marked, onItemPress } = this.props;
    const solar = format(item, 'D');
    const _lunar = ChineseLunar.solarToLunar(item);
    const lunar = ChineseLunar.format(_lunar, 'd');
    const highlightBgColor = '#6E99F1';
    const normalBgColor = 'white';
    const hightlightTextColor = '#fff';
    const normalTextColor = 'rgba(0,0,0,0.9)';
    return (
      <View style={{
        width: width / 7,
        height: 50,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(100,100,100,0.1)',
      }}>
        <TouchableOpacity
          underlayColor='#008b8b'
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: 6,
          }}
          onPress={onItemPress}
        >
          <View style={{
            justifyContent: 'flex-start',
            alignItems: 'center', paddingTop: 4,
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: highlight ? highlightBgColor : normalBgColor,
          }}>
            <Text style={{
              fontSize: 15,
              color: highlight ? hightlightTextColor : normalTextColor,
            }}>{solar}</Text>
            <Text style={{
              fontSize: 10,
              color: highlight ? hightlightTextColor : 'gray',
            }}>{lunar}</Text>
            {marked &&
              <View style={{
                width: 4, height: 4, borderRadius: 2,
                position: 'absolute', bottom: 4, left: 20,
                backgroundColor: highlight ? 'white' : '#6D88E6',
              }} />
            }
          </View>
        </TouchableOpacity>
      </View>
    );
  }
}

class CalendarStrip extends Component {
  constructor(props) {
    super(props);
    this.state = {
      datas: this.getInitialDates(),
      isTodayVisible: true,
      pageOfToday: 2, // page of today in calendar, start from 0
      currentPage: 2, // current page in calendar,  start from 0
    };
  }

  componentWillMount() {
    const touchThreshold = 50;
    const speedThreshold = 0.2;
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dy, vy } = gestureState;
        // console.log(gestureState);
        if (dy > touchThreshold && vy > speedThreshold) {
          const { onSwipeDown } = this.props;
          onSwipeDown && onSwipeDown();
        }
        return false;
      },
      onPanResponderRelease: () => {},
    });
  }

  componentDidMount() {
    setTimeout(() => {
      this.scrollToPage(2);
    }, 100);
  }

  componentWillReceiveProps(nextProps) {
    if (isSameDay(nextProps.selectedDate, this.props.selectedDate)) return;
    const nextSelectedDate = nextProps.selectedDate;
    if (!this.currentPageDatesIncludes(nextSelectedDate)) {
      const sameDay = (d) => isSameDay(d, nextSelectedDate);
      if (this.state.datas.find(sameDay)) {
        let selectedIndex = this.state.datas.findIndex(sameDay);
        if (selectedIndex === -1) selectedIndex = this.state.pageOfToday; // in case not find
        const selectedPage = ~~(selectedIndex / 7);
        this.scrollToPage(selectedPage);
      } else {
        // not born, then spawn these dates, then scroll to it.
        // past: born [startOfThatWeek, last]
        // future: born [first, endOfThatWeek]
        // momentumEnd() handle pageOfToday and currentPage
        if (isFuture(nextSelectedDate)) {
          const head = this.state.datas[0];
          const tail = endOfWeek(nextSelectedDate);
          const days = eachDay(head, tail);
          this.setState({
            datas: days,
            isTodayVisible: false,
          }, () => {
            const page = ~~(days.length/7 - 1);
            // to last page
            this.scrollToPage(page);
          });
        } else {
          const head = startOfWeek(nextSelectedDate);
          const tail = this.state.datas[this.state.datas.length - 1];
          const days = eachDay(head, tail);
          this.setState({
            datas: days,
            isTodayVisible: false,
          }, () => {
            // to first page
            this.scrollToPage(0);
          });
        }
      }
    }
  }

  scrollToPage = (page, animated=true) => {
    this._calendar.scrollToIndex({ animated, index: 7 * page });
  }

  currentPageDatesIncludes = (date) => {
    const { currentPage } = this.state;
    const currentPageDates = this.state.datas.slice(7*currentPage, 7*(currentPage+1));
    // dont use currentPageDates.includes(date); because can't compare Date in it
    return !!currentPageDates.find(d => isSameDay(d, date));
  }

  getInitialDates() {
    // const todayInWeek = getDay(TODAY);
    const last2WeekOfToday = subDays(TODAY, 7 * 2);
    const next2WeekOfToday = addDays(TODAY, 7 * 2);
    const startLast2Week = startOfWeek(last2WeekOfToday);
    const endNext2Week = endOfWeek(next2WeekOfToday);
    const eachDays = eachDay(startLast2Week, endNext2Week);
    return eachDays;
  }

  loadNextTwoWeek(originalDates) {
    const originalFirstDate = originalDates[0];
    const originalLastDate = originalDates[originalDates.length-1];
    const lastDayOfNext2Week = addDays(originalLastDate, 7 * 2);
    const eachDays = eachDay(originalFirstDate, lastDayOfNext2Week);
    this.setState({ datas: eachDays });
  }

  loadPreviousTwoWeek(originalDates) {
    const originalFirstDate = originalDates[0];
    const originalLastDate = originalDates[originalDates.length-1];
    const firstDayOfPrevious2Week = subDays(originalFirstDate, 7 * 2);
    const eachDays = eachDay(firstDayOfPrevious2Week, originalLastDate);
    this.setState(prevState => ({
      datas: eachDays,
      currentPage: prevState.currentPage+2,
      pageOfToday: prevState.pageOfToday+2,
    }), () => {
      this.scrollToPage(2, false);
    });
  }

  _renderHeader = () => {
    const { selectedDate, onPressGoToday } = this.props;
    const todayFormatted = format(selectedDate, 'YYYY/MM/DD [周]dd', {locale: ChineseLocale});
    const weekNumber = getISOWeek(selectedDate);
    return (
      <View style={{
        height: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
      }}>
        <Text style={{
          color: 'gray',
          fontSize: 13,
        }}>{todayFormatted}</Text>
        <Text style={{
          color: '#3D6DCF',
          fontSize: 14,
        }}>{` W${weekNumber}`}</Text>
        {!this.state.isTodayVisible &&
          <TouchableOpacity style={{
            borderRadius: 10,
            width: 20, height: 20,
            backgroundColor: '#3D6DCF',
            position: 'absolute', top: 5, right: 90,
            justifyContent: 'center', alignItems: 'center',
          }} onPress={() => {
            const page = this.state.pageOfToday;
            onPressGoToday && onPressGoToday(TODAY);
            this.scrollToPage(page);
          }}>
            <Text style={{ fontSize: 12, color: 'white' }}>今</Text>
          </TouchableOpacity>
        }
      </View>
    );
  }

  _stringToDate = (dateString) => {
    // '2018-01-01' => Date
    const dateArr = dateString.split('-');
    const [y, m, d] = dateArr.map(ds => parseInt(ds, 10));
    // console.log(y, m, d);
    // CAVEAT: Jan is 0
    return new Date(y, m-1, d);
  }

  render() {
    const { selectedDate, onPressDate, markedDate } = this.props;
    const marked = markedDate.map(ds => this._stringToDate(ds));
    return (
      <View style={{
        height: 30+30+50, width,
      }} {...this._panResponder.panHandlers}>
        {this._renderHeader()}
        <Weeks />
        <FlatList
          ref={ref => this._calendar = ref}
          bounces={false}
          horizontal
          pagingEnabled
          automaticallyAdjustContentInsets
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={this.momentumEnd}
          scrollEventThrottle={500}
          getItemLayout={(data, index) => (
            {length: ITEM_LENGTH, offset: ITEM_LENGTH * index, index}
          )}
          onEndReached={() => { this.onEndReached(); } }
          onEndReachedThreshold={0.01}
          data={this.state.datas}
          extraData={this.state}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({item}) =>
            <DateItem
              item={item}
              onItemPress={() => onPressDate && onPressDate(item)}
              highlight={isSameDay(selectedDate, item)}
              marked={marked.find(d => isSameDay(d, item))}
            />}
        />
      </View>
    );
  }

  momentumEnd = (event) => {
    // console.log(event.nativeEvent);
    /**
      {
        contentInset: { bottom: 0, top: 0, left: 0, right: 0 },
        zoomScale: 1,
        contentOffset: { y: 0, x: 1875 },
        layoutMeasurement: { height: 50, width: 375 },
        contentSize: { height: 50, width: 2625 }
      }
    */
    const firstDayInCalendar = this.state.datas ? this.state.datas[0] : new Date();
    const daysBeforeToday = differenceInDays(firstDayInCalendar, new Date());
    const pageOfToday = ~~(Math.abs(daysBeforeToday / 7));
    const screenWidth = event.nativeEvent.layoutMeasurement.width;
    const currentPage = event.nativeEvent.contentOffset.x / screenWidth;
    // console.log(daysBeforeToday, pageOfToday, currentPage);
    this.setState({
      pageOfToday,
      currentPage,
      isTodayVisible: currentPage === pageOfToday,
    });

    // swipe to head ~ load 2 weeks
    if (event.nativeEvent.contentOffset.x < width) {
      this.loadPreviousTwoWeek(this.state.datas);
    }
  }

  onEndReached() {
    // console.log('onEndReached');
    this.loadNextTwoWeek(this.state.datas);
  }
}

CalendarStrip.propTypes = {
  selectedDate: PropTypes.object.isRequired,
  onPressDate: PropTypes.func,
  onPressGoToday: PropTypes.func,
  markedDate: PropTypes.array,
  onSwipeDown: PropTypes.func,
};

export default CalendarStrip;