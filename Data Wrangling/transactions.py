# Import pandas
import os
from pickle import NONE
import numpy as np
import pandas as pd
from datetime import datetime
from datetime import timezone
from dateutil.relativedelta import relativedelta

join = os.path.join

home = './'
filepath = "./Datasets/Journals/"

finjournal_csv = "FinancialJournal"
checkinjournal_csv = "CheckinJournal"
format = ".csv"

df_finjournal = pd.read_csv(filepath + finjournal_csv + format)
# df_finjournal['timestamp']=pd.to_datetime(df_finjournal['timestamp'])

df_finjournal['timestamp'] = pd.to_datetime(
    df_finjournal['timestamp']).dt.tz_localize(None)

""" print(df_finjournal.at[0,'timestamp'])
d = datetime.fromisoformat('2022-05-01T00:00:00Z'[:-1])
h = pd.Timestamp(d, tz=None).to_pydatetime()
print(h)
print(h > d) """

df_finjournal.sort_values(
    by=['timestamp', 'participantId'], inplace=True, ignore_index=True)

df_education = df_finjournal[df_finjournal['category'] == 'Education']
""" fullname = os.path.join(
    './Monthly Data', 'education' + '.csv')
df_education_trans.to_csv(fullname, index=False) """


df_finjournal = df_finjournal[(df_finjournal['category'] == 'Food') | (
    df_finjournal['category'] == 'Recreation')]

""" fullname = os.path.join(
    './Monthly Data', 'fin_foodrec_sorted' + '.csv')
df_finjournal.to_csv(fullname, index=False) """

df_checkinjournal = pd.read_csv(filepath + checkinjournal_csv + format)
df_checkinjournal['timestamp'] = pd.to_datetime(
    df_checkinjournal['timestamp']).dt.tz_localize(None)
df_checkinjournal.sort_values(
    by=['timestamp', 'participantId'], inplace=True, ignore_index=True)

""" fullname = os.path.join(
    './Monthly Data', 'checkin_journal_sorted' + '.csv')
df_checkinjournal.to_csv(fullname, index=False) """

len_df_checkinjournal = len(df_checkinjournal.index)


def write_to_csv(df, directory):
    month_df = pd.DataFrame.from_records(df)
    month_df.to_csv(directory, index=False)


def update_checkedin_data(trans_time, checkedin_data, checkin_index, part_id):
    global df_checkinjournal
    global len_df_checkinjournal

    """ print('AT BEGIN')
    print('fin trans')
    print(datetime.fromisoformat(trans_time[:-1]))
    print('checkin trans')
    print(datetime.fromisoformat(
        df_checkinjournal.at[checkin_index, 'timestamp'][:-1]))
    print(checkin_index) """

    """ while datetime.fromisoformat(
            df_checkinjournal.at[checkin_index, 'timestamp'][:-1]) <= datetime.fromisoformat(trans_time[:-1]): """
    while df_checkinjournal.at[checkin_index, 'timestamp'] <= trans_time:
        checkedin_data[part_id,
                       0] = df_checkinjournal.at[checkin_index, 'venueType']
        checkedin_data[part_id,
                       1] = df_checkinjournal.at[checkin_index, 'venueId']

        if checkin_index < len_df_checkinjournal-1:
            checkin_index += 1
        else:
            break
    """ print('AT END')
    print('fin trans')
    print(datetime.fromisoformat(trans_time[:-1]))
    print('checkin trans')
    print(datetime.fromisoformat(
        df_checkinjournal.at[checkin_index, 'timestamp'][:-1])) """

    return checkin_index, checkedin_data

    """ while True:
        checkedin_data[part_id,
                       0] = df_checkinjournal.at[checkin_index, 'venueType']
        checkedin_data[part_id,
                       1] = df_checkinjournal.at[checkin_index, 'venueId']
        checkin_index += 1
        if trans_time <= df_checkinjournal.at[checkin_index, 'timestamp']:
            break
    return checkin_index """


def find_transaction(pubs_transactions, restaurants_transactions, checkedin_data, row):
    global df_pubs
    global df_restaurants

    part_id = int(row['participantId'])
    entry = {'timestamp': row['timestamp'],
             'participantId': part_id,
             'amount': row['amount']
             }
    if checkedin_data[part_id, 0] in ['Pub', 'Restaurant']:
        # we know the id of the Pub/Restaurant
        # transaction category is 'Food' or 'Recreation' --> matches with 'Restaurant' or 'Pub'
        #print(checkedin_data[part_id, 0])
        entry['id'] = checkedin_data[part_id, 1]
        # print(entry)
        restaurants_transactions.append(
            entry) if checkedin_data[part_id, 0] == 'Restaurant' else pubs_transactions.append(entry)
    #elif checkedin_data[part_id, 0] in ['Food', 'Recreation', None]:
    else:
        # special case: no checkin data so far or transaction made outside a restaurant/pub
        # add the transaction to a generic lot
        entry['id'] = -1
        #print(entry)
        # print(entry)
        # assumption: Financial transactions for "Food" are assumed to be ordered from restaurants (although it could be pub/restaurant)
        restaurants_transactions.append(
            entry) if row['category'] == 'Food' else pubs_transactions.append(entry)
    """ restaurants_transactions.append(
        entry) if checkedin_data[part_id, 0] == 'Restaurant' else pubs_transactions.append(entry) """

    if checkedin_data[part_id, 0] == 'Restaurant':
        if len(df_restaurants[df_restaurants['restaurantId'] == checkedin_data[part_id, 1]]) == 0:
            print('REST NOT FOUND')
            print(checkedin_data[part_id, 1])
    elif checkedin_data[part_id, 0] == 'Pub':
        if len(df_pubs[df_pubs['pubId'] == checkedin_data[part_id, 1]]) == 0:
            print('PUB NOT FOUND')
            print(checkedin_data[part_id, 1])

    return pubs_transactions, restaurants_transactions


def get_food_recreation_transactions():

    global df_pubs
    global df_restaurants
    global df_finjournal
    global df_checkinjournal
    
    pubs_transactions = []
    restaurants_transactions = []

    len_df_finjournal = len(df_finjournal.index)
    month_num = 0

    # test whether all rows have been written
    total_rows_trans = 0
    # Education transaction happens at midnight
    # checkin data for each participant
    # columns: venue type, venue id
    checkedin_data = np.full((1011, 2), None)
    checkin_index = 0

    df_pubs = pd.read_csv('./Datasets/Attributes/Pubs.csv')
    df_restaurants = pd.read_csv('./Datasets/Attributes/Restaurants.csv')

    # starts from March 1st 2022
    current_month_start_time = datetime.fromisoformat(
        '2022-03-01T00:00:00Z'[:-1])
    next_month_start_time = current_month_start_time + \
        relativedelta(months=1)  # 1 month after

    for k, (index, row) in enumerate(df_finjournal.iterrows()):
        #d = datetime.fromisoformat(row['timestamp'][:-1])
        d = row['timestamp']

        # end of month
        if d >= next_month_start_time:

            # write monthly data
            directory = os.path.join('./Monthly Data', 'Transactions', 'Pubs',
                                     'Month' + str(month_num) + '.csv')
            write_to_csv(pubs_transactions, directory)
            directory = os.path.join('./Monthly Data', 'Transactions', 'Restaurants',
                                     'Month' + str(month_num) + '.csv')
            write_to_csv(restaurants_transactions, directory)

            total_rows_trans += len(restaurants_transactions) + \
                len(pubs_transactions)

            restaurants_transactions *= 0
            pubs_transactions *= 0
            # update month interval
            next_month_start_time = next_month_start_time + relativedelta(
                months=1)
            month_num += 1

        checkin_d = df_checkinjournal.at[checkin_index, 'timestamp']
        """ checkin_d = datetime.fromisoformat(
            df_checkinjournal.at[checkin_index, 'timestamp'][:-1]) """

        if checkin_d <= d:
            # let checkin time catch up with financial transaction time
            # first, update all participants' activity in checkedin_data until (and including) current datetime at fin transaction
            # this also updates checkin_index
            checkin_index, checkedin_data = update_checkedin_data(
                row['timestamp'], checkedin_data, checkin_index, int(row['participantId']))
            # check for current financial transaction in checkedin_data
            pubs_transactions, restaurants_transactions = find_transaction(pubs_transactions,
                                                                           restaurants_transactions, checkedin_data, row)

        elif checkin_d > d:
            # no updates from checkin data, use the current location where participant has checked-in in checkedin_data
            pubs_transactions, restaurants_transactions = find_transaction(pubs_transactions,
                                                                           restaurants_transactions, checkedin_data, row)

        # end condition - if last line in financial journal,
        # check : or checkin_index == len_df_checkinjournal
        if k == len_df_finjournal-1:
            print('at end')
            # write monthly data
            directory = os.path.join('./Monthly Data', 'Transactions', 'Pubs',
                                     'Month' + str(month_num) + '.csv')
            write_to_csv(pubs_transactions, directory)
            directory = os.path.join('./Monthly Data', 'Transactions', 'Restaurants',
                                     'Month' + str(month_num) + '.csv')
            write_to_csv(restaurants_transactions, directory)

            total_rows_trans += len(restaurants_transactions) + \
                len(pubs_transactions)

            print(k)
            print(total_rows_trans)
            print(len_df_finjournal)
            break


def remove_duplicate_transactions():
    global df_education

    # remove duplicate transactions for all participants under Education in the first month
    for i in range(1011):
        # filter by participant id i
        indices_df = df_education.index[df_education['participantId'] == i]
        if len(indices_df) >= 1:
            # drop duplicate transaction under Education in the first month
            if df_education.at[indices_df[0], 'amount'] == df_education.at[indices_df[1], 'amount'] and \
                    df_education.at[indices_df[0], 'timestamp'] == df_education.at[indices_df[1], 'timestamp']:
                df_education = df_education.drop(indices_df[1])


def get_education_transactions():
    global df_education

    df_schools = pd.read_csv('./Datasets/Attributes/Schools.csv')
    edu_trans = []

    len_df_education = len(df_education.index)

    # starts from March 1st 2022
    current_month_start_time = datetime.fromisoformat(
        '2022-03-01T00:00:00Z'[:-1])
    next_month_start_time = current_month_start_time + \
        relativedelta(months=1)  # 1 month after

    total_rows = 0
    month_num = 0

    for k, (index, row) in enumerate(df_education.iterrows()):
        #d = datetime.fromisoformat(row['timestamp'][:-1])
        d = row['timestamp']

        # end of month
        if d >= next_month_start_time:
            # write monthly data to csv
            directory = os.path.join('./Monthly Data', 'Transactions', 'Schools',
                                     'Month' + str(month_num) + '.csv')
            write_to_csv(edu_trans, directory)
            total_rows += len(edu_trans)
            edu_trans *= 0
            # update month interval
            next_month_start_time = next_month_start_time + relativedelta(
                months=1)
            month_num += 1

        # df marks the school with the same tuition fee (rounded to 3 decimals)
        # Only 1 schools will match as each school has a different tuition fee
        df = df_schools[round(df_schools['monthlyCost'], 3)
                        == round(abs(row['amount']), 3)]

        if not df.empty:
            # each school has unique monthlyCost, so this should match to 1 school
            school_row = df.iloc[0]
            edu_trans.append({
                'timestamp': row['timestamp'],
                'participantId': row['participantId'],
                'id': school_row['schoolId'],
                'amount': row['amount']
            })

        # at last row of df_education
        if k == len_df_education-1:
            # write monthly data
            directory = os.path.join('./Monthly Data', 'Transactions', 'Schools',
                                     'Month' + str(month_num) + '.csv')
            write_to_csv(edu_trans, directory)
            total_rows += len(edu_trans)

            print(k)
            print(total_rows)
            print(len_df_education)
            break


if __name__ == '__main__':
    get_food_recreation_transactions()
    """ remove_duplicate_transactions()
    get_education_transactions() """
    # pass
