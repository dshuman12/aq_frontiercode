#source data
#!/bin/bash
file_name='preprod-data.csv'
if [ -e "$file_name" ]
    then
        echo "File name $file_name exists!"
    else
        echo "File name $file_name does not exists!"
        echo "Creating New file $file_name!"

        src_data="CREDIT_CARD_NUMBER,4111111111111110,1"
        type=`echo $src_data |cut -f1 -d','`
        plain_text=`echo $src_data |cut -f2 -d','`
        index_1=`echo $src_data |cut -f3 -d','`

        echo type1,plaintext1,index1,type2,plaintext2,index2>> $file_name

        for i  in {1..20000}
           do
               card_num_1=$((plain_text + i))
               card_num_2=$((card_num_1 + 1))
               index_2=$((index_1 + 1))
               echo $type,$card_num_1,$index_1,$type,$card_num_2,$index_2>> $file_name
        done
fi
